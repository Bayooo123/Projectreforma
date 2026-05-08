import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { sendWeeklyDigestAllWorkspaces } from '@/lib/weeklyDigest';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!config.CRON_SECRET || authHeader !== `Bearer ${config.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Weekly digest starting...');
    const results = await sendWeeklyDigestAllWorkspaces();

    const summary = results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { error: (r.reason as Error)?.message }
    );

    console.log('[Cron] Weekly digest complete:', JSON.stringify(summary));
    return NextResponse.json({ success: true, results: summary });
}
