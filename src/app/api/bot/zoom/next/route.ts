import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth } from '@/lib/api-auth';

// Polled by the local Zoom join-bot (zoom-bot/) — it has no inbound address
// of its own (an office PC behind a home/office router), so it pulls work
// instead of having it pushed. Claim is best-effort (findFirst, then an
// update guarded by status still being 'pending'): fine for the single-bot
// case this is built for, not meant to survive multiple bots racing.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { auth, error } = await withApiAuth(req);
    if (error) return error;

    const pending = await prisma.meetingBotRequest.findFirst({
        where: { workspaceId: auth!.workspaceId, status: 'pending' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, meetingLink: true, briefId: true },
    });
    if (!pending) return NextResponse.json({ job: null });

    const claimed = await prisma.meetingBotRequest.updateMany({
        where: { id: pending.id, status: 'pending' },
        data: { status: 'claimed', claimedAt: new Date() },
    });
    if (claimed.count === 0) return NextResponse.json({ job: null });

    return NextResponse.json({
        job: { id: pending.id, meetingLink: pending.meetingLink, briefId: pending.briefId },
    });
}
