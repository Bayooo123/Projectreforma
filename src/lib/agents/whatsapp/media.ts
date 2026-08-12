import { config } from '@/lib/config';

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

export interface DownloadedMedia {
    buffer: Buffer;
    mimeType: string;
    size: number;
}

// Meta hands back a media ID, not a file — resolving it takes two Graph API
// calls: ID → a short-lived signed URL, then that URL → the actual bytes.
// Both calls need the same bearer token; the second doesn't work without it
// even though the URL looks like a normal file link.
export async function downloadWhatsAppMedia(mediaId: string): Promise<DownloadedMedia | null> {
    const token = config.WHATSAPP_TOKEN;
    if (!token) {
        console.error('[WhatsApp] WHATSAPP_TOKEN not set — cannot download media');
        return null;
    }

    const lookupRes = await fetch(`${GRAPH_URL}/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!lookupRes.ok) {
        console.error('[WhatsApp] Media lookup failed:', lookupRes.status, await lookupRes.text());
        return null;
    }
    const meta = await lookupRes.json() as { url?: string; mime_type?: string; file_size?: number };
    if (!meta.url) {
        console.error('[WhatsApp] Media lookup returned no url:', meta);
        return null;
    }

    const fileRes = await fetch(meta.url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileRes.ok) {
        console.error('[WhatsApp] Media download failed:', fileRes.status);
        return null;
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    return {
        buffer: Buffer.from(arrayBuffer),
        mimeType: meta.mime_type || fileRes.headers.get('content-type') || 'application/octet-stream',
        size: meta.file_size || arrayBuffer.byteLength,
    };
}
