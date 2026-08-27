import { config } from '@/lib/config';

// Server-to-Server OAuth — no user ever signs into Zoom for this; the app
// credentials alone authenticate as the Zoom account itself. Used only to
// download a cloud recording file after the "Recording Completed" webhook
// (src/app/api/webhooks/zoom-meeting/route.ts) tells us it's ready.

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
    if (!config.ZOOM_ACCOUNT_ID || !config.ZOOM_CLIENT_ID || !config.ZOOM_CLIENT_SECRET) return null;
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

    const basic = Buffer.from(`${config.ZOOM_CLIENT_ID}:${config.ZOOM_CLIENT_SECRET}`).toString('base64');
    const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${config.ZOOM_ACCOUNT_ID}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}` },
    });
    if (!res.ok) {
        console.error('[Zoom] Failed to get access token:', res.status, await res.text());
        return null;
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    // Refresh a minute early rather than exactly on expiry.
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return cachedToken.token;
}

export async function downloadZoomRecording(downloadUrl: string): Promise<Buffer | null> {
    const token = await getAccessToken();
    if (!token) return null;

    const res = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
        console.error('[Zoom] Failed to download recording:', res.status, await res.text().catch(() => ''));
        return null;
    }
    return Buffer.from(await res.arrayBuffer());
}
