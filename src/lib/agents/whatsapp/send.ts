import { config } from '@/lib/config';

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

const MAX_LENGTH = 4000;

function chunk(text: string): string[] {
    if (text.length <= MAX_LENGTH) return [text];
    const parts: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
        // Try to break at a newline within the limit
        const slice = remaining.slice(0, MAX_LENGTH);
        const breakAt = slice.lastIndexOf('\n');
        const end = breakAt > MAX_LENGTH / 2 ? breakAt : MAX_LENGTH;
        parts.push(remaining.slice(0, end).trim());
        remaining = remaining.slice(end).trim();
    }
    return parts;
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
    const token = config.WHATSAPP_TOKEN;
    const phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
        console.error('[WhatsApp] WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set');
        return;
    }

    const parts = chunk(text);
    for (const part of parts) {
        const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: part },
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('[WhatsApp] Send failed:', res.status, err);
        }
    }
}
