import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { config } from '@/lib/config';
import { handleWhatsAppMessage } from '@/lib/agents/whatsapp';
import { handleWhatsAppDocument, type IncomingWhatsAppDocument } from '@/lib/agents/whatsapp/documents';
import { sendWhatsAppMessage } from '@/lib/agents/whatsapp/send';

// A message type we recognise but can't act on yet (voice notes, video,
// stickers, shared locations/contacts) used to be silently dropped — no
// reply at all, indistinguishable from the bot being down. Every one of
// these now gets an honest, specific reply instead of going quiet.
function unsupportedMessageFor(type: string): string {
    switch (type) {
        case 'audio':
            return "I can't listen to voice notes yet — type your question and I'll answer right away.";
        case 'video':
            return "I can't watch videos yet — send it as a document, or describe what you need in words.";
        case 'sticker':
            return "That sticker doesn't carry anything I can act on — what did you need?";
        case 'location':
            return "I can't do anything with a shared location yet — tell me in words what you need.";
        case 'contacts':
            return "I can't process a shared contact card yet — what would you like me to do with it?";
        default:
            return "I can't handle that kind of message yet — try typing your question as text.";
    }
}

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
    type WaInteractive = { button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
    type WaButton = { text: string; payload: string };
    type WaMsg = {
        from: string; type: string;
        text?: { body: string }; document?: WaMedia; image?: WaMedia;
        interactive?: WaInteractive; button?: WaButton;
    };
    type WaChange = { value: { messages?: WaMsg[] } };
    type WaEntry = { changes: WaChange[] };
    const entries = (body.entry as WaEntry[]) ?? [];

    const incomingText: Array<{ from: string; text: string }> = [];
    const incomingDocs: IncomingWhatsAppDocument[] = [];
    const incomingUnsupported: Array<{ from: string; type: string }> = [];

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
                } else if (msg.type === 'interactive' && msg.interactive) {
                    // Button/list reply — treat its title as if the user had typed it.
                    const title = msg.interactive.button_reply?.title ?? msg.interactive.list_reply?.title;
                    if (title) incomingText.push({ from: msg.from, text: title });
                } else if (msg.type === 'button' && msg.button) {
                    incomingText.push({ from: msg.from, text: msg.button.text });
                } else if (msg.type === 'reaction') {
                    // An emoji reaction to a past message — nothing to reply to, and
                    // acknowledging it would be noise, so this is a deliberate no-op.
                } else {
                    incomingUnsupported.push({ from: msg.from, type: msg.type || 'unknown' });
                }
            }
        }
    }

    if (incomingText.length === 0 && incomingDocs.length === 0 && incomingUnsupported.length === 0) {
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
        for (const { from, type } of incomingUnsupported) {
            try {
                await sendWhatsAppMessage(from, unsupportedMessageFor(type));
            } catch (err) {
                console.error('[WhatsApp] Unhandled unsupported-type error for', from, err);
            }
        }
    });

    return NextResponse.json({ ok: true });
}
