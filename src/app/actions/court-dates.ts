'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Get all court dates (events) for a workspace, including past and future.
 * This enables a true "Litigation Calendar" view rather than just a "Next Date" list.
 */
export async function getCourtEvents(workspaceId: string) {
    try {
        const events = await prisma.courtDate.findMany({
            where: {
                matter: {
                    workspaceId: workspaceId
                }
            },
            include: {
                matter: {
                    select: {
                        id: true,
                        caseNumber: true,
                        name: true,
                        client: {
                            select: { name: true }
                        },
                        lawyers: {
                            include: {
                                lawyer: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    }
                },
                appearances: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });
        return events;
    } catch (error) {
        console.error('Error fetching court events:', error);
        return [];
    }
}
