import { NextRequest, NextResponse } from 'next/server';
import { syncAscolpMailbox } from '@/lib/services/imap-sync';

// Vercel's own Cron feature is once-a-day-only on this project's (Hobby)
// plan, far too infrequent for "mail should show up in Reforma promptly" —
// so this is triggered by a GitHub Actions schedule instead
// (.github/workflows/email-imap-sync.yml), same CRON_SECRET as every other
// /api/cron/* route.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    try {
        const result = await syncAscolpMailbox();
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error('[email-imap-sync] Error:', error);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}
