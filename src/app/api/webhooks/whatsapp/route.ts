import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { config } from '@/lib/config';
import { handleWhatsAppMessage } from '@/lib/agents/whatsapp';

// ── GET: Meta webhook verification challenge ─────────────────────────────────
export async function GET(req: NextRequest) {
    const mode      = req.nextUrl.searchParams.get('hub.mode');
    const token     = req.nextUrl.searchParams.get('hub.verify_token');
    const challenge = req.nextUrl.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
        console.log('[WhatsApp] Webhook verified');
        return new Response(challenge ?? '', { status: 200 });
    }

    console.warn('[WhatsApp] Verification failed — token mismatch');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── POST: Incoming messages ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Only handle WhatsApp Business Account events
    if (body.object !== 'whatsapp_business_account') {
        return NextResponse.json({ ok: true });
    }

    // Extract messages from the Meta payload
    type WaMsg = { from: string; type: string; text?: { body: string } };
    type WaChange = { value: { messages?: WaMsg[] } };
    type WaEntry = { changes: WaChange[] };
    const entries = (body.entry as WaEntry[]) ?? [];

    const incoming: Array<{ from: string; text: string }> = [];
    for (const entry of entries) {
        for (const change of entry.changes ?? []) {
            for (const msg of change.value?.messages ?? []) {
                if (msg.type === 'text' && msg.text?.body) {
                    incoming.push({ from: msg.from, text: msg.text.body.trim() });
                }
            }
        }
    }

    if (incoming.length === 0) {
        return NextResponse.json({ ok: true });
    }

    // Process messages after returning 200 — Meta requires fast acknowledgement
    after(async () => {
        for (const { from, text } of incoming) {
            try {
                await handleWhatsAppMessage(from, text);
            } catch (err) {
                console.error('[WhatsApp] Unhandled error for', from, err);
            }
        }
    });

    return NextResponse.json({ ok: true });
}
