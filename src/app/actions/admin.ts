"use server";

import { prisma } from '@/lib/prisma';
import { requirePlatformAdmin } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

/**
 * Fetch high-level platform statistics for Reforma HQ
 */
export async function getPlatformStats() {
    await requirePlatformAdmin();

    const [workspacesCount, usersCount, waitlistCount, briefsCount] = await Promise.all([
        prisma.workspace.count(),
        prisma.user.count(),
        prisma.waitlist.count(),
        prisma.brief.count(),
    ]);

    return {
        workspaces: workspacesCount,
        users: usersCount,
        waitlist: waitlistCount,
        briefs: briefsCount,
    };
}

/**
 * List all waitlist entries
 */
export async function getWaitlistEntries() {
    await requirePlatformAdmin();

    return prisma.waitlist.findMany({
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Approve a waitlist entry (Placeholder for now, logic can be expanded)
 * In a real scenario, this might trigger an email invite or create a placeholder user.
 */
export async function approveWaitlistEntry(id: string) {
    await requirePlatformAdmin();

    const entry = await prisma.waitlist.findUnique({ where: { id } });
    if (!entry) throw new Error('Waitlist entry not found');

    // For now, we'll just delete the entry to "clear" it from the list
    // A more advanced flow would involve creating an Invitation record.
    await prisma.waitlist.delete({ where: { id } });

    revalidatePath('/admin/waitlist');
    return { success: true };
}

/**
 * List all workspaces with basic info
 */
export async function listWorkspaces() {
    await requirePlatformAdmin();

    return prisma.workspace.findMany({
        include: {
            owner: {
                select: {
                    name: true,
                    email: true,
                }
            },
            _count: {
                select: {
                    members: true,
                    briefs: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * List all users on the platform
 */
export async function listUsers() {
    await requirePlatformAdmin();

    return prisma.user.findMany({
        include: {
            _count: {
                select: {
                    workspaces: true,
                    createdBriefs: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' },
    });
}
