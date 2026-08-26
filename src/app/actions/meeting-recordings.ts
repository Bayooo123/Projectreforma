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
    title: string | null;
    briefName: string | null;
    briefNumber: string | null;
}

// A recording is scoped one of three ways — see the MeetingRecording model
// comment in prisma/schema.prisma. calendarEntryId identifies a specific
// meeting; { workspaceId, briefId } identifies a brief-tied recording with
// no calendar entry; { workspaceId } alone identifies the general,
// unattached feed.
export type RecordingScope =
    | { calendarEntryId: string }
    | { workspaceId: string; briefId?: string };

function toRow(r: {
    id: string; audioUrl: string; durationSeconds: number | null; transcriptStatus: string;
    transcriptText: string | null; createdAt: Date; title: string | null;
    createdBy: { name: string | null } | null;
    brief: { name: string; briefNumber: string } | null;
}): MeetingRecordingRow {
    return {
        id: r.id,
        audioUrl: r.audioUrl,
        durationSeconds: r.durationSeconds,
        transcriptStatus: r.transcriptStatus,
        transcriptText: r.transcriptText,
        createdAt: r.createdAt,
        createdByName: r.createdBy?.name ?? null,
        title: r.title,
        briefName: r.brief?.name ?? null,
        briefNumber: r.brief?.briefNumber ?? null,
    };
}

const SELECT = {
    id: true, audioUrl: true, durationSeconds: true, transcriptStatus: true,
    transcriptText: true, createdAt: true, title: true,
    createdBy: { select: { name: true } },
    brief: { select: { name: true, briefNumber: true } },
} as const;

export async function getMeetingRecordings(scope: RecordingScope): Promise<MeetingRecordingRow[]> {
    const session = await requireAuth();

    if ('calendarEntryId' in scope) {
        const { entry, membership } = await getMembershipForCalendarEntry(scope.calendarEntryId, session.id!);
        if (!entry || !membership) return [];

        const recordings = await prisma.meetingRecording.findMany({
            where: { calendarEntryId: scope.calendarEntryId },
            select: SELECT,
            orderBy: { createdAt: 'desc' },
        });
        return recordings.map(toRow);
    }

    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId: scope.workspaceId, user: { id: session.id! } },
    });
    if (!membership) return [];

    const recordings = await prisma.meetingRecording.findMany({
        where: scope.briefId
            ? { workspaceId: scope.workspaceId, briefId: scope.briefId }
            : { workspaceId: scope.workspaceId, briefId: null, calendarEntryId: null },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
    });
    return recordings.map(toRow);
}

// The full feed for the Recordings page — every recording in the workspace
// regardless of scope, newest first.
export async function getWorkspaceRecordings(workspaceId: string): Promise<MeetingRecordingRow[]> {
    const session = await requireAuth();
    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, user: { id: session.id! } },
    });
    if (!membership) return [];

    const recordings = await prisma.meetingRecording.findMany({
        where: { workspaceId },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
    return recordings.map(toRow);
}

export async function deleteMeetingRecording(recordingId: string) {
    try {
        const session = await requireAuth();

        const recording = await prisma.meetingRecording.findUnique({
            where: { id: recordingId },
            select: { workspaceId: true },
        });
        if (!recording) return { success: false, error: 'Recording not found' };

        const membership = await prisma.workspaceMember.findFirst({
            where: { workspaceId: recording.workspaceId, user: { id: session.id! } },
        });
        if (!membership) return { success: false, error: 'Not a member of this workspace' };

        await prisma.meetingRecording.delete({ where: { id: recordingId } });
        return { success: true };
    } catch (error) {
        console.error('Error deleting meeting recording:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete recording' };
    }
}
