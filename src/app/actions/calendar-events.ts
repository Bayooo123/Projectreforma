'use server';

import { prisma } from '@/lib/prisma';

/**
 * Get all calendar entries for a workspace, including past and future.
 * Supports the Unified Legal Calendar.
 */
export async function getCalendarEvents(workspaceId: string) {
    try {
        const events = await prisma.calendarEntry.findMany({
            where: {
                OR: [
                    { matter: { workspaceId: workspaceId } },
                    { matterId: null } // Firm-wide events not linked to matter? 
                    // Actually, CalendarEntry has workspace relation?
                ]
            },
            include: {
                matter: {
                    select: {
                        id: true,
                        caseNumber: true,
                        name: true,
                        client: {
                            select: { name: true }
                        }
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
        console.error('Error fetching calendar events:', error);
        return [];
    }
}
