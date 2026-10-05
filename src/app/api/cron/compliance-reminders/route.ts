import { NextRequest, NextResponse } from 'next/server';
import { runComplianceReminders } from '@/lib/compliance-reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Replaces the unregistered /api/cron/daily, which held the only compliance
// due-date logic but never ran in production.
export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    try {
        const result = await runComplianceReminders();
        console.log('[compliance-reminders]', result);
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error('[compliance-reminders] Error:', error);
        return NextResponse.json({ error: 'Reminder run failed' }, { status: 500 });
    }
}
