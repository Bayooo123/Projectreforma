'use server';

import { prisma } from '@/lib/prisma';

/**
 * Get calendar entries for a workspace within a specific date range.
 * This is the unified Event system.
 */
export async function getCalendarEvents(workspaceId: string, startDate?: Date, endDate?: Date) {
    try {
        const events = await prisma.calendarEntry.findMany({
            where: {
                OR: [
                    { matter: { workspaceId: workspaceId } },
                    { clientId: { not: null }, matter: { workspaceId: workspaceId } } // Catch meetings linked to workspace via matter
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

