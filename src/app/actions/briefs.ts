'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { requireAuth } from '@/lib/auth-utils';

export async function getBriefs(workspaceId: string) {
    await requireAuth();
    noStore(); // Force dynamic fetching, disable cache
    try {
        console.log('[getBriefs] ========== START ==========');
        console.log('[getBriefs] Fetching briefs for workspace:', workspaceId);

        const briefs = await prisma.brief.findMany({
            where: {
                workspaceId,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                documents: {
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        type: true,
                        size: true,
                        uploadedAt: true,
                    },
                },
                _count: {
                    select: {
                        documents: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        console.log('[getBriefs] ✅ Found', briefs.length, 'briefs');
        if (briefs.length > 0) {
            console.log('[getBriefs] Brief IDs:', briefs.map(b => b.id));
            console.log('[getBriefs] Brief Numbers:', briefs.map(b => b.briefNumber));
            console.log('[getBriefs] Brief Names:', briefs.map(b => b.name));
        }
        console.log('[getBriefs] ========== END ==========');

        return briefs;
    } catch (error) {
        console.error('[getBriefs] ========== ERROR ==========');
        console.error('[getBriefs] Error fetching briefs:', error);
        console.error('[getBriefs] ========== ERROR END ==========');
        return [];
    }
}

export async function getBriefById(id: string) {
    await requireAuth();
    noStore(); // Force dynamic fetching
    try {
        const brief = await prisma.brief.findUnique({
            where: { id },
            include: {
                client: true,
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                matter: true,
                documents: true,
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return brief;
    } catch (error) {
        console.error('Error fetching brief:', error);
        return null;
    }
}

export async function createBrief(data: {
    briefNumber: string;
    name: string;
    clientId: string;
    lawyerId: string;
    workspaceId: string;
    category: string;
    status: string;
    dueDate?: Date;
    description?: string;
}) {
    await requireAuth();
    try {
        console.log('[createBrief] ========== START ==========');
        console.log('[createBrief] Creating brief with data:', JSON.stringify(data, null, 2));

        // Validate briefNumber is provided
        if (!data.briefNumber || data.briefNumber.trim() === '') {
            console.error('[createBrief] ERROR: Brief number is empty!');
            return { success: false, error: 'Brief number is required' };
        }

        // Use explicit transaction to ensure atomic operation
        const result = await prisma.$transaction(async (tx) => {
            console.log('[createBrief] Starting database transaction...');

            // Check if briefNumber already exists
            const existing = await tx.brief.findUnique({
                where: { briefNumber: data.briefNumber }
            });

            if (existing) {
                console.error('[createBrief] ERROR: Brief number already exists:', data.briefNumber);
                throw new Error(`Brief number "${data.briefNumber}" already exists. Please use a different number.`);
            }

            console.log('[createBrief] Brief number is unique, proceeding with creation...');

            const brief = await tx.brief.create({
                data: {
                    briefNumber: data.briefNumber,
                    name: data.name,
                    clientId: data.clientId,
                    lawyerId: data.lawyerId,
                    workspaceId: data.workspaceId,
                    category: data.category,
                    status: data.status,
                    dueDate: data.dueDate,
                    description: data.description,
                },
                include: {
                    client: true,
                    lawyer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            console.log('[createBrief] ✅ Brief created in transaction!');
            console.log('[createBrief] Brief ID:', brief.id);
            console.log('[createBrief] Brief Number:', brief.briefNumber);
            console.log('[createBrief] Brief Name:', brief.name);

            return brief;
        }, {
            maxWait: 5000, // Maximum time to wait for a transaction slot (ms)
            timeout: 10000, // Maximum time the transaction can run (ms)
        });

        console.log('[createBrief] ✅ Transaction committed successfully!');

        // Verify the brief was actually saved (outside transaction)
        const verification = await prisma.brief.findUnique({
            where: { id: result.id }
        });

        if (verification) {
            console.log('[createBrief] ✅ VERIFICATION: Brief exists in database');
        } else {
            console.error('[createBrief] ❌ VERIFICATION FAILED: Brief not found in database!');
            throw new Error('Brief was not persisted to database');
        }

        console.log('[createBrief] Waiting 1s for replication...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('[createBrief] Calling revalidatePath("/briefs")');
        revalidatePath('/briefs');

        console.log('[createBrief] ========== END ==========');
        return { success: true, brief: result };
    } catch (error: any) {
        console.error('[createBrief] ========== ERROR ==========');
        console.error('[createBrief] Error type:', error.constructor.name);
        console.error('[createBrief] Error message:', error.message);
        console.error('[createBrief] Error code:', error.code);
        console.error('[createBrief] Full error:', error);
        console.error('[createBrief] ========== ERROR END ==========');

        // Handle Prisma unique constraint error
        if (error.code === 'P2002') {
            return { success: false, error: 'Brief number already exists. Please use a different number.' };
        }

        return { success: false, error: 'Failed to create brief: ' + error.message };
    }
}

export async function updateBrief(
    id: string,
    data: {
        name?: string;
        clientId?: string;
        lawyerId?: string;
        category?: string;
        status?: string;
        dueDate?: Date | null;
        description?: string;
    }
) {
    await requireAuth();
    try {
        const brief = await prisma.brief.update({
            where: { id },
            data,
            include: {
                client: true,
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        revalidatePath('/briefs');
        revalidatePath(`/briefs/${id}`);
        return { success: true, brief };
    } catch (error) {
        console.error('Error updating brief:', error);
        return { success: false, error: 'Failed to update brief' };
    }
}

export async function deleteBrief(id: string) {
    try {
        // 1. Fetch brief to identify workspace
        const brief = await prisma.brief.findUnique({
            where: { id },
            select: { workspaceId: true, status: true }
        });

        if (!brief) {
            return { success: false, error: 'Brief not found' };
        }

        // 2. Security Check: Only 'partner' or 'owner' can delete
        // We import dynamically to avoid circular deps if any, though not expected here
        const { requireWorkspaceRole } = await import('@/lib/auth-utils');
        await requireWorkspaceRole(brief.workspaceId, ['partner', 'owner']);

        // 3. Soft Delete Logic
        // Instead of deleting, we mark as 'inactive'.
        // NOTE: A background job (Cron) should run daily to permanently delete
        // briefs that have been 'inactive' for > 15 days.
        await prisma.brief.update({
            where: { id },
            data: {
                status: 'inactive',
                updatedAt: new Date() // Updates timestamp for the 15-day timer
            }
        });

        revalidatePath('/briefs');
        return { success: true, message: 'Brief moved to trash (will be permanently deleted in 15 days)' };
    } catch (error: any) {
        console.error('Error deleting brief:', error);
        return { success: false, error: error.message || 'Failed to delete brief' };
    }
}

export async function assignLawyer(briefId: string, lawyerId: string) {
    await requireAuth();
    try {
        const brief = await prisma.brief.update({
            where: { id: briefId },
            data: { lawyerId },
            include: {
                lawyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        revalidatePath('/briefs');
        revalidatePath(`/briefs/${briefId}`);
        return { success: true, brief };
    } catch (error) {
        console.error('Error assigning lawyer:', error);
        return { success: false, error: 'Failed to assign lawyer' };
    }
}
