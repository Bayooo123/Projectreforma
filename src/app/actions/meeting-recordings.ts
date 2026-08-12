'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { getMembershipForCalendarEntry } from '@/app/actions/calendar-events';

export interface MeetingRecordingRow {
    id: string;
    audioUrl: string;
    durationSeconds: number | null;
    transcriptStatus: string;
    transcriptText: string | null;
    createdAt: Date;
    createdByName: string | null;
}

export async function getMeetingRecordings(calendarEntryId: string): Promise<MeetingRecordingRow[]> {
    const session = await requireAuth();

    const { entry, membership } = await getMembershipForCalendarEntry(calendarEntryId, session.id!);
    if (!entry || !membership) return [];

    const recordings = await prisma.meetingRecording.findMany({
        where: { calendarEntryId },
        select: {
            id: true,
            audioUrl: true,
            durationSeconds: true,
            transcriptStatus: true,
            transcriptText: true,
            createdAt: true,
            createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return recordings.map(r => ({
        id: r.id,
        audioUrl: r.audioUrl,
        durationSeconds: r.durationSeconds,
        transcriptStatus: r.transcriptStatus,
        transcriptText: r.transcriptText,
        createdAt: r.createdAt,
        createdByName: r.createdBy?.name ?? null,
    }));
}

export async function deleteMeetingRecording(recordingId: string) {
    try {
        const session = await requireAuth();

        const recording = await prisma.meetingRecording.findUnique({
            where: { id: recordingId },
            select: { calendarEntryId: true, createdById: true },
        });
        if (!recording) return { success: false, error: 'Recording not found' };

        const { membership } = await getMembershipForCalendarEntry(recording.calendarEntryId, session.id!);
        if (!membership) return { success: false, error: 'Not a member of this workspace' };

        await prisma.meetingRecording.delete({ where: { id: recordingId } });
        return { success: true };
    } catch (error) {
        console.error('Error deleting meeting recording:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete recording' };
    }
}
