import { NextRequest, NextResponse } from 'next/server';

// Legacy stub — superseded by /api/cron/process-notifications
// Kept for backwards-compatibility; secured and returns a redirect hint.

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        success: true,
        message: 'This endpoint is deprecated. Use /api/cron/process-notifications instead.',
    });
}
