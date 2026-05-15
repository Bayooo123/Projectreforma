import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { sendWeekInCourtAllWorkspaces } from '@/lib/weekInCourt';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!config.CRON_SECRET || authHeader !== `Bearer ${config.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Week in Court starting...');
    const results = await sendWeekInCourtAllWorkspaces();

    const summary = results.map(r =>
        r.status === 'fulfilled' ? r.value : { error: (r.reason as Error)?.message }
    );

    console.log('[Cron] Week in Court complete:', JSON.stringify(summary));
    return NextResponse.json({ success: true, results: summary });
}
