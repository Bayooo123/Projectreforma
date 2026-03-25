'use server';

import { prisma } from '@/lib/prisma';

/**
 * Get all calendar entries for a workspace, including past and future.
 * Supports the Unified Legal Calendar by aggregating from multiple sources:
 * 1. Explicit CalendarEntry records (new system)
 * 2. Matter.nextCourtDate (legacy scheduled data)
 * 3. MatterActivityLog 'hearing' entries (legacy history)
 */
export async function getCalendarEvents(workspaceId: string) {
    try {
        // 1. Fetch from New System (CalendarEntry)
        const entries = await prisma.calendarEntry.findMany({
            where: {
                OR: [
                    { matter: { workspaceId: workspaceId } }
                ]
            },
            include: {
                matter: {
                    select: {
                        id: true,
                        caseNumber: true,
                        name: true,
                        client: { select: { id: true, name: true } }
                    }
                },
                appearances: {
                    select: { id: true, name: true, email: true, image: true }
                },
                meetingRecording: true
            },
            orderBy: { date: 'asc' }
        });

        // 2. Fetch Legacy Scheduled Dates (Matter.nextCourtDate)
        const mattersWithNextDate = await prisma.matter.findMany({
            where: {
                workspaceId,
                nextCourtDate: { not: null }
            },
            include: {
                client: { select: { id: true, name: true } }
            }
        });

        // 3. Fetch Legacy History (Activity Logs)
        const activityLogs = await prisma.matterActivityLog.findMany({
            where: {
                matter: { workspaceId },
                activityType: { in: ['hearing', 'court_date_changed', 'proceedings_recorded'] }
            },
            include: {
                matter: {
                    select: {
                        id: true,
                        caseNumber: true,
                        name: true,
                        client: { select: { id: true, name: true } }
                    }
                },
                user: { select: { name: true, image: true } }
            }
        });

        // Transform Legacy Matters to Calendar Events
        const legacyScheduledEvents = mattersWithNextDate
            .filter(m => {
                // Deduplicate: Don't show if there's already a CalendarEntry for this date
                return !entries.some(e =>
                    e.matterId === m.id &&
                    e.date.toDateString() === m.nextCourtDate?.toDateString()
                );
            })
            .map(m => ({
                id: `legacy-sched-${m.id}`,
                date: m.nextCourtDate!,
                type: 'COURT_DATE' as const,
                title: 'Scheduled Hearing',
                proceedings: null,
                adjournedFor: null,
                matterId: m.id,
                matter: {
                    id: m.id,
                    caseNumber: m.caseNumber,
                    name: m.name,
                    client: m.client
                },
                appearances: [] // Appearances weren't explicitly tracked in legacy nextCourtDate
            }));

        // Transform Activity Logs to Calendar Events
        const historyEvents = activityLogs.map(log => ({
            id: `legacy-hist-${log.id}`,
            date: log.timestamp,
            type: 'COURT_DATE' as const,
            title: 'Past Proceeding',
            proceedings: log.description,
            adjournedFor: null,
            matterId: log.matterId,
            matter: log.matter,
            appearances: [] // Activity logs don't have the same connection as appearances
        }));

        // Combine All and transform to strict CalendarEvent type
        const allEvents: any[] = [...entries, ...legacyScheduledEvents, ...historyEvents];
        
        const transformedEvents = allEvents.map(e => ({
            ...e,
            type: e.type || 'COURT_DATE',
            matter: e.matter ? {
                id: e.matter.id,
                name: e.matter.name,
                caseNumber: e.matter.caseNumber,
                client: e.matter.client
            } : null,
            appearances: e.appearances || []
        })).sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        return transformedEvents as any[]; // Using any[] to bypass strictness here and let the UI cast it
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        return [];
    }
}
