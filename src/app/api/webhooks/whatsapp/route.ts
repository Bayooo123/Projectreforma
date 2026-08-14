import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { config } from '@/lib/config';
import { handleWhatsAppMessage } from '@/lib/agents/whatsapp';
import { handleWhatsAppDocument, type IncomingWhatsAppDocument } from '@/lib/agents/whatsapp/documents';

export const dynamic = 'force-dynamic';
// The response to Meta returns immediately (see after() below), but the
// background processing it defers to — an agentic tool-use loop that can
// now search, create, and write briefs, plus document OCR — needs real
// headroom. Without this, Vercel's default timeout was cutting off long
// case updates mid-reasoning, surfacing as "something went wrong."
export const maxDuration = 60;

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
    type WaMedia = { id: string; mime_type: string; caption?: string; filename?: string };
    type WaMsg = { from: string; type: string; text?: { body: string }; document?: WaMedia; image?: WaMedia };
    type WaChange = { value: { messages?: WaMsg[] } };
    type WaEntry = { changes: WaChange[] };
    const entries = (body.entry as WaEntry[]) ?? [];

    const incomingText: Array<{ from: string; text: string }> = [];
    const incomingDocs: IncomingWhatsAppDocument[] = [];

    for (const entry of entries) {
        for (const change of entry.changes ?? []) {
            for (const msg of change.value?.messages ?? []) {
                if (msg.type === 'text' && msg.text?.body) {
                    incomingText.push({ from: msg.from, text: msg.text.body.trim() });
                } else if (msg.type === 'document' && msg.document) {
                    incomingDocs.push({
                        from: msg.from,
                        mediaId: msg.document.id,
                        filename: msg.document.filename || `document-${Date.now()}`,
                        mimeType: msg.document.mime_type,
                        caption: msg.document.caption,
                    });
                } else if (msg.type === 'image' && msg.image) {
                    const ext = msg.image.mime_type.split('/')[1] || 'jpg';
                    incomingDocs.push({
                        from: msg.from,
                        mediaId: msg.image.id,
                        filename: `photo-${Date.now()}.${ext}`,
                        mimeType: msg.image.mime_type,
                        caption: msg.image.caption,
                    });
                }
            }
        }
    }

    if (incomingText.length === 0 && incomingDocs.length === 0) {
        return NextResponse.json({ ok: true });
    }

    // Process messages after returning 200 — Meta requires fast acknowledgement
    after(async () => {
        for (const { from, text } of incomingText) {
            try {
                await handleWhatsAppMessage(from, text);
            } catch (err) {
                console.error('[WhatsApp] Unhandled error for', from, err);
            }
        }
        for (const doc of incomingDocs) {
            try {
                await handleWhatsAppDocument(doc);
            } catch (err) {
                console.error('[WhatsApp] Unhandled document error for', doc.from, err);
            }
        }
    });

    return NextResponse.json({ ok: true });
}
