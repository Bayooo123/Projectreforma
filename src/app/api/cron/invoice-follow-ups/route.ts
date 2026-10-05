import { NextRequest, NextResponse } from 'next/server';
import { runInvoiceFollowUps } from '@/lib/invoice-follow-ups';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    try {
        const result = await runInvoiceFollowUps();
        console.log('[invoice-follow-ups]', result);
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error('[invoice-follow-ups] Error:', error);
        return NextResponse.json({ error: 'Follow-up run failed' }, { status: 500 });
    }
}
