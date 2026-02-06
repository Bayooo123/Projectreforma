'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { nanoid } from 'nanoid';

/**
 * Get all clients for a workspace
 */
export async function getClientsForWorkspace(workspaceId: string) {
    try {
        const clients = await prisma.client.findMany({
            where: { workspaceId },
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
            },
            orderBy: { name: 'asc' },
        });
        return clients;
    } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
    }
}

/**
 * Get all briefs for a workspace (including Matter and Client info)
 */
export async function getBriefs(workspaceId: string) {
    try {
        const briefs = await prisma.brief.findMany({
            where: { workspaceId },
            include: {
                client: {
                    select: { id: true, name: true }
                },
                matter: {
                    select: { id: true, name: true, caseNumber: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return briefs;
    } catch (error) {
        console.error('Error fetching briefs:', error);
        return [];
    }
}


/**
 * Get all lawyers/users for a workspace
 */
export async function getLawyersForWorkspace(workspaceId: string) {
    try {
        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return members.map(m => ({
            id: m.user.id,
            name: m.user.name || m.user.email,
            email: m.user.email,
            role: m.role,
        }));
    } catch (error) {
        console.error('Error fetching lawyers:', error);
        return [];
    }
}

/**
 * Generate a unique brief number for a workspace
 */
export async function generateBriefNumber(workspaceId: string): Promise<string> {
    try {
        // Get the count of existing briefs
        const count = await prisma.brief.count({
            where: { workspaceId },
        });

        // Generate number like BRF-001, BRF-002, etc.
        const number = `BRF-${String(count + 1).padStart(3, '0')}`;

        // Check if it already exists (edge case)
        const existing = await prisma.brief.findUnique({
            where: { briefNumber: number },
        });

        if (existing) {
            // If exists, append random suffix
            return `${number}-${nanoid(4)}`;
        }

        return number;
    } catch (error) {
        console.error('Error generating brief number:', error);
        // Fallback to random number
        return `BRF-${nanoid(6)}`;
    }
}

/**
 * Get brief statistics for a workspace
 */
export async function getBriefStats(workspaceId: string) {
    try {
        const [total, active, inactive, finalized] = await Promise.all([
            prisma.brief.count({ where: { workspaceId } }),
            prisma.brief.count({ where: { workspaceId, status: 'active' } }),
            prisma.brief.count({ where: { workspaceId, status: 'inactive' } }),
            prisma.brief.count({ where: { workspaceId, status: 'finalized' } }),
        ]);

        return { total, active, inactive, finalized };
    } catch (error) {
        console.error('Error fetching brief stats:', error);
        return { total: 0, active: 0, inactive: 0, finalized: 0 };
    }
}

/**
 * Create a client quickly (for use in brief creation)
 */
export async function createClientQuick(workspaceId: string, name: string, email?: string) {
    try {
        const client = await prisma.client.create({
            data: {
                name,
                email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@client.com`,
                workspaceId,
            },
        });
        return { success: true, client };
    } catch (error) {
        console.error('Error creating client:', error);
        return { success: false, error: 'Failed to create client' };
    }
}

/**
 * Add an activity log entry to a brief
 */
export async function addBriefActivity(
    briefId: string,
    type: 'note_added' | 'email_received' | 'status_changed' | 'document_uploaded',
    description: string,
    metadata?: any,
    performedBy?: string
) {
    try {
        const activity = await prisma.briefActivityLog.create({
            data: {
                briefId,
                activityType: type,
                description,
                metadata: metadata || {},
                performedBy,
            },
        });
        return { success: true, activity };
    } catch (error) {
        console.error('Error adding brief activity:', error);
        return { success: false, error: 'Failed to add activity log' };
    }
}

/**
 * Get activity logs for a brief
 */
export async function getBriefActivity(briefId: string) {
    try {
        const logs = await prisma.briefActivityLog.findMany({
            where: { briefId },
            orderBy: { timestamp: 'desc' },
            include: {
                user: {
                    select: { name: true, email: true, image: true },
                },
            },
        });
        return logs;
    } catch (error) {
        console.error('Error fetching brief activity:', error);
        return [];
    }
}
/**
 * Add a note to a brief (User Action)
 */
export async function addBriefNote(briefId: string, note: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    return await addBriefActivity(
        briefId,
        'note_added',
        note,
        {},
        session.user.id
    );
}
