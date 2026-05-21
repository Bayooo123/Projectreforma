'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getPermissionsForRole } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/log-activity';

const SPECIAL_DELETE_EMAIL = 'bayo@abiolasanniandco.com';

function getSystemRole(role: string): string {
    const r = role.toLowerCase();
    if (r.includes('managing partner')) return 'owner';
    if (r.includes('head of chambers') || r.includes('head of chamber')) return 'partner';
    if (r.includes('partner')) return 'partner';
    if (r.includes('manager') || r.includes('admin')) return 'admin';
    if (r.includes('associate')) return 'associate';
    return 'member';
}

async function getMembershipForCalendarEntry(entryId: string, userId: string) {
    const entry = await prisma.calendarEntry.findUnique({
        where: { id: entryId },
        select: {
            submittingLawyerId: true,
            deletedAt: true,
            matter: { select: { workspaceId: true } },
            brief: { select: { workspaceId: true } },
            client: { select: { workspaceId: true } },
        },
    });
    if (!entry) return { entry: null, workspaceId: null, membership: null };

    const workspaceId = entry.matter?.workspaceId ?? entry.brief?.workspaceId ?? entry.client?.workspaceId;
    if (!workspaceId) return { entry, workspaceId: null, membership: null };

    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, user: { id: userId } },
    });

    return { entry, workspaceId, membership };
}

export async function getCourtEntriesForWorkspace(workspaceId: string) {
    await requireAuth();
    return prisma.calendarEntry.findMany({
        where: {
            deletedAt: null,
            type: 'COURT',
            OR: [
                { matter: { workspaceId } },
                { client: { workspaceId } },
            ],
        },
        select: {
            id: true,
            title: true,
            date: true,
            court: true,
            proceedings: true,
            outcome: true,
            adjournedFor: true,
            adjournedTo: true,
            appearances: { select: { id: true, name: true, email: true } },
            matter: { select: { id: true, name: true, caseNumber: true } },
        },
        orderBy: { date: 'desc' },
        take: 100,
    });
}

/**
 * Get calendar entries for a workspace within a specific date range.
 * This is the unified Event system.
 */
export async function getCalendarEvents(workspaceId: string, startDate?: Date, endDate?: Date) {
    try {
        const events = await prisma.calendarEntry.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { matter: { workspaceId } },
                    { brief: { workspaceId } },
                    { client: { workspaceId } },
                ],
                ...(startDate || endDate ? {
                    date: {
                        ...(startDate ? { gte: startDate } : {}),
                        ...(endDate ? { lte: endDate } : {}),
                    }
                } : {}),
            },
            include: {
                matter: {
                    select: {
                        id: true,
                        caseNumber: true,
                        name: true,
                        court: true,
                        judge: true,
                        client: { select: { id: true, name: true } }
                    }
                },
                appearances: {
                    select: { id: true, name: true, email: true, image: true }
                }
            },
            orderBy: { date: 'asc' }
        });

        return events.map(e => ({
            id: e.id,
            type: e.type,
            title: e.title,
            date: e.date,
            proceedings: e.proceedings,
            outcome: e.outcome,
            adjournedFor: e.adjournedFor,
            adjournedTo: e.adjournedTo,
            court: e.court || e.matter?.court,
            judge: e.judge || e.matter?.judge,
            location: e.location,
            agenda: e.agenda,
            description: e.description,
            matterId: e.matterId,
            submittingLawyerId: e.submittingLawyerId,
            matter: e.matter,
            appearances: e.appearances,
        }));
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        return [];
    }
}

export async function deleteCalendarEntry(entryId: string) {
    const user = await requireAuth();
    const { entry, workspaceId, membership } = await getMembershipForCalendarEntry(entryId, user.id!);

    if (!entry) return { success: false, error: 'Entry not found' };
    if (entry.deletedAt) return { success: false, error: 'Entry already deleted' };

    const isSpecialEmail = user.email === SPECIAL_DELETE_EMAIL;
    const isCreator = entry.submittingLawyerId === user.id;

    let hasRolePermission = false;
    if (membership) {
        const systemRole = getSystemRole(membership.role);
        const permissions = getPermissionsForRole(membership.role);
        hasRolePermission = permissions.includes('DELETE_CALENDAR_ENTRY') || systemRole === 'owner';
    }

    if (!hasRolePermission && !isCreator && !isSpecialEmail) {
        return { success: false, error: 'Forbidden: You do not have permission to delete this entry' };
    }

    await prisma.calendarEntry.update({
        where: { id: entryId },
        data: { deletedAt: new Date(), deletedById: user.id },
    });

    if (workspaceId) {
        logActivity({
            workspaceId,
            userId: user.id!,
            resource: 'COURT_DATE',
            action: 'DELETED',
            resourceId: entryId,
            resourceName: entry ? 'Calendar Entry' : entryId,
        }).catch(() => {});
    }

    revalidatePath('/calendar');
    return { success: true };
}

export async function restoreCalendarEntry(entryId: string) {
    const user = await requireAuth();
    const { entry, workspaceId, membership } = await getMembershipForCalendarEntry(entryId, user.id!);

    if (!entry) return { success: false, error: 'Entry not found' };
    if (!entry.deletedAt) return { success: false, error: 'Entry is not deleted' };

    if (!membership) return { success: false, error: 'Forbidden: Not a workspace member' };

    const systemRole = getSystemRole(membership.role);
    const permissions = getPermissionsForRole(membership.role);
    const canRestore = permissions.includes('RESTORE_CALENDAR_ENTRY') || systemRole === 'owner';

    if (!canRestore) {
        return { success: false, error: 'Forbidden: Only IT Management or Managing Partners can restore deleted entries' };
    }

    await prisma.calendarEntry.update({
        where: { id: entryId },
        data: { deletedAt: null, deletedById: null },
    });

    if (workspaceId) {
        logActivity({
            workspaceId,
            userId: user.id!,
            resource: 'COURT_DATE',
            action: 'UPDATED',
            resourceId: entryId,
            resourceName: 'Calendar Entry (Restored)',
        }).catch(() => {});
    }

    revalidatePath('/calendar');
    return { success: true };
}

export async function getDeletedCalendarEntries(workspaceId: string) {
    const user = await requireAuth();

    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, user: { id: user.id! } },
    });

    if (!membership) return { success: false, error: 'Forbidden', data: [] };

    const systemRole = getSystemRole(membership.role);
    const permissions = getPermissionsForRole(membership.role);
    const canView = permissions.includes('RESTORE_CALENDAR_ENTRY') || systemRole === 'owner';

    if (!canView) return { success: false, error: 'Forbidden', data: [] };

    const entries = await prisma.calendarEntry.findMany({
        where: {
            deletedAt: { not: null },
            OR: [
                { matter: { workspaceId } },
                { brief: { workspaceId } },
                { client: { workspaceId } },
            ],
        },
        select: {
            id: true,
            title: true,
            type: true,
            date: true,
            court: true,
            deletedAt: true,
            deletedById: true,
            matter: { select: { id: true, name: true, caseNumber: true } },
        },
        orderBy: { deletedAt: 'desc' },
    });

    return { success: true, data: entries };
}
