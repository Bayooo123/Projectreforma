'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export async function getCourtEntriesForWorkspace(workspaceId: string) {
    await requireAuth();
    return prisma.calendarEntry.findMany({
        where: {
            type: 'COURT',
            OR: [
                { matter: { workspaceId } },
                { clientId: { in: (await prisma.client.findMany({ where: { workspaceId }, select: { id: true } })).map(c => c.id) } },
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
        // Restore legacy visibility: some historical entries were created
        // with briefId/clientId only (no matter relation).
        const [matters, briefs, clients] = await Promise.all([
            prisma.matter.findMany({
                where: { workspaceId },
                select: { id: true },
            }),
            prisma.brief.findMany({
                where: { workspaceId },
                select: { id: true },
            }),
            prisma.client.findMany({
                where: { workspaceId },
                select: { id: true },
            }),
        ]);

        const matterIds = matters.map(m => m.id);
        const briefIds = briefs.map(b => b.id);
        const clientIds = clients.map(c => c.id);

        const events = await prisma.calendarEntry.findMany({
            where: {
                OR: [
                    { matter: { workspaceId: workspaceId } },
                    ...(matterIds.length ? [{ matterId: { in: matterIds } }] : []),
                    ...(briefIds.length ? [{ briefId: { in: briefIds } }] : []),
                    ...(clientIds.length ? [{ clientId: { in: clientIds } }] : []),
                ],
                date: {
                    gte: startDate || undefined,
                    lte: endDate || undefined
                }
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

        // Map to a clean Event model for the UI
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
            matter: e.matter,
            appearances: e.appearances
        }));
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        return [];
    }
}

