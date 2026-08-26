import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { sendWhatsAppMessage } from '@/lib/agents/whatsapp/send';

// Manual smoke test for the WhatsApp send pipeline — bypasses the AI agent
// and the brief-manager scan entirely, so a failure here means the problem
// is credentials/Graph API/phone formatting, not analysis logic. Not wired
// into any cron or UI; call it directly while testing, then it can be
// deleted once the pipeline is trusted.
//
//   GET /api/dev/test-whatsapp?to=2348031234567&message=hello
//   Authorization: Bearer <CRON_SECRET>  (same secret every /api/cron/* route uses)
// The secret is also accepted as a ?secret= query param, purely so this can
// be triggered through tools that can't set custom headers — acceptable for
// a throwaway internal test route, not a pattern to carry into anything
// that stays.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization');
    const secretParam = req.nextUrl.searchParams.get('secret');
    const authorised = !!config.CRON_SECRET && (auth === `Bearer ${config.CRON_SECRET}` || secretParam === config.CRON_SECRET);
    if (!authorised) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const to = req.nextUrl.searchParams.get('to');
    if (!to) {
        return NextResponse.json({ error: 'Missing required query param: to (phone number, digits only, with country code)' }, { status: 400 });
    }

    const message = req.nextUrl.searchParams.get('message')
        ?? 'This is a test message from Reforma — if you can read this, the WhatsApp send pipeline is working.';

    try {
        await sendWhatsAppMessage(to.replace(/\D/g, ''), message);
        return NextResponse.json({ ok: true, to, message });
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ ok: false, error: detail }, { status: 500 });
    }
}
