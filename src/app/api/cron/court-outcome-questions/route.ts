import { NextRequest, NextResponse } from 'next/server';
import { generateCourtQuestions } from '@/lib/generateCourtQuestions';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[CourtQ] CRON_SECRET not configured');
        return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[CourtQ] Unauthorized access attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[CourtQ] Generating court outcome questions…');
        const result = await generateCourtQuestions();
        console.log(`[CourtQ] Done: ${result.generated} generated, ${result.errors.length} errors`);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('[CourtQ] Fatal error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
