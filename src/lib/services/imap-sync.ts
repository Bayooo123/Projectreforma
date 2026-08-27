import { ImapFlow } from 'imapflow';
import { simpleParser, type AddressObject } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';

// Polls the ascolp@reforma.ng mailbox over IMAP and replays new messages
// through the same POST /api/import/emails pipeline the manual backfill
// script (scripts/email-sync/) already uses — that endpoint handles
// dedup/classification/matching/attachments, this module's only job is
// "what's new since last time" and handing it over in the right shape.
//
// Exists because the provider-side auto-forward/webhook relay (Zoho Flow)
// that was meant to push mail into Reforma in real time is unreliable; this
// polls instead of depending on that relay firing.
//
// The sync cursor (last IMAP UID processed) is stored in
// WorkspaceEmailConfig.emailIntegration — an unused Json column already on
// the row for ascolp@reforma.ng, so no schema change was needed for this.

const MAILBOX_ADDRESS = 'ascolp@reforma.ng';
const MAX_MESSAGES_PER_RUN = 50; // keep each cron invocation well inside typical serverless time limits
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // mirrors ATTACHMENT_ALLOWED_TYPES cap in email-ingestion.ts

interface SyncCursor {
    imapUidValidity: number;
    imapLastUid: number;
}

interface ImportAttachment {
    filename: string;
    content_type: string;
    data: string; // base64
}

interface ImportEmail {
    message_id?: string;
    from: string;
    to?: string;
    cc?: string;
    date?: string;
    subject: string;
    body_text?: string;
    body_html?: string;
    attachments?: ImportAttachment[];
}

export interface ImapSyncResult {
    skipped?: string;
    fetched: number;
    imported: number;
    duplicates: number;
    noise: number;
    errors: number;
}

function addressToHeader(addr: AddressObject | AddressObject[] | undefined): string | undefined {
    if (!addr) return undefined;
    const list = Array.isArray(addr) ? addr : [addr];
    return list.flatMap(a => a.value).map(v => v.name ? `${v.name} <${v.address}>` : (v.address ?? '')).join(', ') || undefined;
}

function parseCursor(stored: unknown): SyncCursor | null {
    if (stored && typeof stored === 'object' && 'imapUidValidity' in stored && 'imapLastUid' in stored) {
        const c = stored as Record<string, unknown>;
        if (typeof c.imapUidValidity === 'number' && typeof c.imapLastUid === 'number') {
            return { imapUidValidity: c.imapUidValidity, imapLastUid: c.imapLastUid };
        }
    }
    return null;
}

async function saveCursor(configId: string, cursor: SyncCursor): Promise<void> {
    await prisma.workspaceEmailConfig.update({
        where: { id: configId },
        data: { emailIntegration: { ...cursor } },
    });
}

export async function syncAscolpMailbox(): Promise<ImapSyncResult> {
    const empty: ImapSyncResult = { fetched: 0, imported: 0, duplicates: 0, noise: 0, errors: 0 };

    if (!config.ZOHO_IMAP_USER || !config.ZOHO_IMAP_PASSWORD || !config.EMAIL_SYNC_API_KEY) {
        console.log('[ImapSync] Not configured (ZOHO_IMAP_USER/PASSWORD or EMAIL_SYNC_API_KEY missing) — skipping.');
        return { ...empty, skipped: 'not_configured' };
    }

    const emailConfig = await prisma.workspaceEmailConfig.findFirst({
        where: { emailAddress: { equals: MAILBOX_ADDRESS, mode: 'insensitive' }, isActive: true },
        select: { id: true, emailIntegration: true },
    });
    if (!emailConfig) {
        console.log(`[ImapSync] No active WorkspaceEmailConfig for ${MAILBOX_ADDRESS} — skipping.`);
        return { ...empty, skipped: 'no_workspace_config' };
    }

    const client = new ImapFlow({
        host: config.ZOHO_IMAP_HOST,
        port: 993,
        secure: true,
        auth: { user: config.ZOHO_IMAP_USER, pass: config.ZOHO_IMAP_PASSWORD },
        logger: false,
    });

    const emails: ImportEmail[] = [];

    try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        try {
            if (!client.mailbox) throw new Error('IMAP server did not report mailbox status after opening INBOX');
            const uidValidity = Number(client.mailbox.uidValidity);
            const uidNext = client.mailbox.uidNext;

            let cursor = parseCursor(emailConfig.emailIntegration);
            if (!cursor || cursor.imapUidValidity !== uidValidity) {
                // First run, or the mailbox was rebuilt server-side (UIDVALIDITY changed) —
                // start watching from here rather than replaying the mailbox's full history.
                cursor = { imapUidValidity: uidValidity, imapLastUid: uidNext - 1 };
                await saveCursor(emailConfig.id, cursor);
                console.log(`[ImapSync] Initialized cursor at UID ${cursor.imapLastUid} (uidValidity=${uidValidity})`);
            }

            const range = `${cursor.imapLastUid + 1}:*`;
            let highestSeenUid = cursor.imapLastUid;

            for await (const msg of client.fetch(range, { source: true }, { uid: true })) {
                if (msg.uid <= cursor.imapLastUid) continue; // '*' in a range can echo the last existing message
                // Stop (not skip) once the cap is hit, and leave the cursor before this
                // message — otherwise it'd be marked "seen" without ever being imported,
                // and the next run would never revisit it. The remainder is picked up
                // on the next run instead.
                if (emails.length >= MAX_MESSAGES_PER_RUN) break;

                if (!msg.source) {
                    console.warn(`[ImapSync] Message UID ${msg.uid} had no source in the fetch response — skipping.`);
                    highestSeenUid = msg.uid;
                    continue;
                }

                const parsed = await simpleParser(msg.source);
                const attachments: ImportAttachment[] = [];
                for (const att of parsed.attachments) {
                    if (att.size > MAX_ATTACHMENT_BYTES) continue;
                    attachments.push({
                        filename: att.filename || 'attachment',
                        content_type: att.contentType,
                        data: att.content.toString('base64'),
                    });
                }

                emails.push({
                    message_id: parsed.messageId,
                    from: addressToHeader(parsed.from) || '',
                    to: addressToHeader(parsed.to),
                    cc: addressToHeader(parsed.cc),
                    date: parsed.date?.toISOString(),
                    subject: parsed.subject || '(no subject)',
                    body_text: parsed.text,
                    body_html: typeof parsed.html === 'string' ? parsed.html : undefined,
                    attachments: attachments.length ? attachments : undefined,
                });
                highestSeenUid = msg.uid;
            }

            if (highestSeenUid > cursor.imapLastUid) {
                await saveCursor(emailConfig.id, { imapUidValidity: uidValidity, imapLastUid: highestSeenUid });
            }
        } finally {
            lock.release();
        }
        await client.logout();
    } catch (err) {
        console.error('[ImapSync] IMAP connection/fetch failed:', err);
        await client.logout().catch(() => {});
        throw err;
    }

    if (emails.length === 0) {
        return { ...empty };
    }

    const res = await fetch(`${config.NEXT_PUBLIC_APP_URL}/api/import/emails`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.EMAIL_SYNC_API_KEY}`,
        },
        body: JSON.stringify(emails),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[ImapSync] /api/import/emails failed (${res.status}):`, body);
        return { fetched: emails.length, imported: 0, duplicates: 0, noise: 0, errors: emails.length };
    }

    const result = await res.json() as { summary?: { processed: number; duplicates: number; noise: number; errors: number } };
    const summary = result.summary ?? { processed: 0, duplicates: 0, noise: 0, errors: emails.length };

    console.log(`[ImapSync] Fetched ${emails.length} new message(s) from ${MAILBOX_ADDRESS} — ${summary.processed} imported, ${summary.duplicates} duplicates, ${summary.noise} noise, ${summary.errors} errors.`);

    return { fetched: emails.length, imported: summary.processed, duplicates: summary.duplicates, noise: summary.noise, errors: summary.errors };
}
