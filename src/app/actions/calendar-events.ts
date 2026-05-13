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

