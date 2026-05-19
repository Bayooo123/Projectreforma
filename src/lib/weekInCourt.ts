import { prisma } from '@/lib/prisma';
import { mailService } from '@/lib/services/mail/mail';
import { config } from '@/lib/config';
import Anthropic from '@anthropic-ai/sdk';

// ── Date helpers ────────────────────────────────────────────────────────────

function getCurrentWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
}

function fmtDateShort(d: Date): string {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtWeekEndDate(d: Date): string {
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function dayKey(d: Date): string {
    return d.toISOString().split('T')[0];
}

// ── Summarisation ────────────────────────────────────────────────────────────

function extractKeySentences(text: string): string {
    if (!text || text.trim().length < 300) return text.trim();

    const sentences = text
        .replace(/\n+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);

    const scored = sentences.map(s => {
        const lower = s.toLowerCase();
        let score = 0;
        if (/adjourn|next date|adjourned to/i.test(lower)) score += 6;
        if (/did not sit|did not hold|stood down/i.test(lower)) score += 6;
        if (/order|grant|direct|rule|held|decid/i.test(lower)) score += 5;
        if (/judgment|ruling/i.test(lower)) score += 5;
        if (/amend|strike out|dismiss|discontinu/i.test(lower)) score += 4;
        if (/settlement|settle/i.test(lower)) score += 4;
        if (/preliminary objection/i.test(lower)) score += 3;
        if (/witness|health|deteriorat/i.test(lower)) score += 3;
        if (/\b(Mr|Mrs|Miss|Ms|Prof|Dr|Alhaji|Chief|Hon)\b\.?\s+[A-Z]/u.test(s)) score += 4;
        if (/\bSAN\b/.test(s)) score += 3;
        if (/appear|present|counsel|watching brief/i.test(lower)) score += 2;
        return { s, score };
    });

    const first = sentences[0];
    const rest = scored
        .filter(x => x.s !== first)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(x => x.s);

    const picked = new Set([first, ...rest]);
    return sentences.filter(s => picked.has(s)).join(' ');
}

async function summarise(text: string): Promise<string> {
    if (!text || text.trim().length < 300) return text.trim();

    if (config.ANTHROPIC_API_KEY) {
        try {
            const ai = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
            const msg = await ai.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 160,
                messages: [{
                    role: 'user',
                    content: `Summarise the following Nigerian court proceedings into 2–3 concise sentences for a law firm's internal weekly email. Preserve key legal facts: orders made, adjournment date and reason, names of counsel who appeared, any rulings. Plain professional English. No bullet points.\n\n${text.trim()}`,
                }],
            });
            if (msg.content[0].type === 'text') return msg.content[0].text.trim();
        } catch (_) { /* fall through to rule-based */ }
    }

    return extractKeySentences(text);
}

// ── Entry types ──────────────────────────────────────────────────────────────

interface WicEntry {
    date: Date;
    matterName: string;
    court: string | null;
    judge: string | null;
    summary: string;
    adjournedTo: Date | null;
    adjournedFor: string | null;
    counsel: string[];
    status: 'normal' | 'did_not_sit' | 'discontinued' | 'judgment';
}

// ── HTML builder ─────────────────────────────────────────────────────────────

function statusStyle(status: WicEntry['status']): { bg: string; border: string; left: string } {
    switch (status) {
        case 'did_not_sit':  return { bg: '#FFF7ED', border: '#FED7AA', left: '#F97316' };
        case 'discontinued': return { bg: '#EFF6FF', border: '#BFDBFE', left: '#2563EB' };
        case 'judgment':     return { bg: '#FFFBEB', border: '#FCD34D', left: '#F59E0B' };
        default:             return { bg: '#F8FAFC', border: '#E2E8F0', left: '#059669' };
    }
}

function statusBadge(status: WicEntry['status']): string {
    switch (status) {
        case 'did_not_sit':  return `<div style="display:inline-block;font-size:10.5px;font-weight:600;color:#C2410C;background:#FFF7ED;border:1px solid #FED7AA;padding:2px 10px;border-radius:20px;margin-bottom:8px;">&#9888; Court Did Not Sit</div><br/>`;
        case 'discontinued': return `<div style="display:inline-block;font-size:10.5px;font-weight:600;color:#1D4ED8;background:#EFF6FF;border:1px solid #BFDBFE;padding:2px 10px;border-radius:20px;margin-bottom:8px;">&#9632; Matter Concluded</div><br/>`;
        case 'judgment':     return `<div style="display:inline-block;font-size:10.5px;font-weight:600;color:#92400E;background:#FFFBEB;border:1px solid #FCD34D;padding:2px 10px;border-radius:20px;margin-bottom:8px;">&#9878; Judgment</div><br/>`;
        default:             return '';
    }
}

function buildWicHtml(
    workspaceName: string,
    weekEnd: Date,
    byDay: Map<string, WicEntry[]>,
    nextMonday: Date,
): string {
    const appUrl = config.NEXT_PUBLIC_APP_URL;
    const scheduled = [...byDay.values()].reduce((n, d) => n + d.length, 0);
    const withOutcome = [...byDay.values()].flat().filter(e => e.summary && !/no outcome/i.test(e.summary)).length;
    const noSit = [...byDay.values()].flat().filter(e => e.status === 'did_not_sit').length;
    const weekEndLabel = `Week Ended ${fmtWeekEndDate(weekEnd)}`;

    const daySections = [...byDay.entries()].map(([, entries]) => {
        const dt = entries[0].date;
        const dayUpper = dt.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
        const dayFull  = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        const cards = entries.map(e => {
            const s = statusStyle(e.status);
            const badge = statusBadge(e.status);
            const courtLine = [
                e.court,
                e.judge ? `Before ${e.judge}` : null,
            ].filter(Boolean).join(' &middot; ');
            const adjLine = e.adjournedTo
                ? `<div style="font-size:11.5px;color:#6B7280;margin-top:8px;">&#8617; Adjourned to: <strong>${fmtDateShort(e.adjournedTo)}${e.adjournedFor ? ' &mdash; ' + e.adjournedFor : ''}</strong></div>`
                : '';
            const counselTags = e.counsel.length
                ? e.counsel.map(c => `<span style="display:inline-block;font-size:11px;font-weight:500;color:#065f46;background:#D1FAE5;padding:2px 9px;border-radius:20px;margin:2px 3px 2px 0;">${c}</span>`).join('')
                : `<span style="font-size:11px;color:#9CA3AF;font-style:italic;">No appearance recorded</span>`;

            return `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr><td style="background:${s.bg};border:1px solid ${s.border};border-left:4px solid ${s.left};border-radius:8px;padding:14px 16px;">
                ${badge}
                <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px;">${e.matterName}</div>
                ${courtLine ? `<div style="font-size:12px;color:#6B7280;margin-bottom:8px;">${courtLine}</div>` : ''}
                <div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:8px;">${e.summary || '<em style="color:#9CA3AF;">No outcome recorded for this date.</em>'}</div>
                ${adjLine}
                <div style="margin-top:8px;">${counselTags}</div>
              </td></tr>
            </table>`;
        }).join('');

        return `
        <tr><td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td style="font-size:11px;font-weight:700;letter-spacing:1.1px;color:#0f172a;text-transform:uppercase;padding-right:10px;white-space:nowrap;">${dayUpper}</td>
              <td style="font-size:11px;color:#9CA3AF;padding-right:10px;white-space:nowrap;">${dayFull}</td>
              <td style="border-top:1px solid #E2E8F0;width:100%;"></td>
            </tr>
          </table>
          ${cards}
        </td></tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${workspaceName} — The Week in Court</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:none;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#064e3b;padding:32px 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;">Re<span style="color:#6EE7B7;">forma</span></td>
        <td align="right"><span style="font-size:11px;font-weight:500;color:#6EE7B7;letter-spacing:1.2px;text-transform:uppercase;background:rgba(110,231,183,0.12);padding:4px 10px;border-radius:20px;border:1px solid rgba(110,231,183,0.25);">The Week in Court</span></td>
      </tr>
    </table>
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#ffffff;line-height:1.2;margin-top:20px;">${weekEndLabel}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px;">${workspaceName} &nbsp;&middot;&nbsp; Court Activity Report</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);">
      <tr>
        <td align="center">
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;">${scheduled}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Scheduled</div>
        </td>
        <td align="center" style="border-left:1px solid rgba(255,255,255,0.12);border-right:1px solid rgba(255,255,255,0.12);">
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;">${withOutcome}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Outcomes Recorded</div>
        </td>
        <td align="center">
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;">${noSit}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Courts Did Not Sit</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Intro -->
  <tr><td style="padding:24px 40px 0;">
    <p style="font-size:13.5px;color:#374151;line-height:1.75;margin:0 0 16px;">
      Reforma serves as the digital operating workspace for Nigerian law firms. In the course of the week ended <strong>${weekEndLabel}</strong>, the following matters were scheduled to come up before various courts. Continue reading to find out what transpired in each case.
    </p>
    <div style="background:#FEF9C3;border:1px solid #FDE047;border-left:4px solid #EAB308;border-radius:8px;padding:12px 16px;font-size:12.5px;color:#713F12;line-height:1.65;">
      <strong>Please note:</strong> Reforma bears no liability for inaccuracies arising from data entered by users into the system. Should you notice any error in the report below, you may correct it directly from your workspace.
    </div>
  </td></tr>

  ${daySections}

  <!-- New week callout -->
  <tr><td style="padding:24px 40px 0;">
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #22C55E;border-radius:8px;padding:14px 16px;font-size:13px;color:#166534;line-height:1.65;">
      A new week begins on <strong>Monday, ${fmtDateShort(nextMonday)}</strong>. Find out what is scheduled across your firm in the <strong>Weekly Digest</strong> sent to you this evening.
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2E8F0;padding-top:20px;">
      <tr><td style="padding-top:20px;">
        <a href="${appUrl}" style="display:inline-block;background:#064e3b;color:#ffffff;font-size:13px;font-weight:500;padding:11px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">Open Your Workspace &rarr;</a>
        <div style="font-size:12px;color:#9CA3AF;line-height:1.7;">
          This report is automatically compiled from court records entered on Reforma during the week. Matters with missing outcomes should be updated by the assigned lawyer before the next digest.<br/>
          You are receiving this as a member of <strong>${workspaceName}</strong>'s workspace on Reforma.
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;padding-top:16px;border-top:1px solid #F1F5F9;">
          <tr>
            <td><span style="display:inline-block;width:8px;height:8px;background:#059669;border-radius:50%;margin-right:8px;vertical-align:middle;"></span><span style="font-family:Georgia,serif;font-size:13px;font-weight:600;color:#064e3b;vertical-align:middle;">Reforma</span></td>
            <td align="right" style="font-size:11.5px;color:#9CA3AF;">Practice Management for Nigerian Law Firms</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="height:32px;"></td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Main send functions ───────────────────────────────────────────────────────

const EXCLUDED_ROLES = new Set(['viewer', 'paralegal']);

export async function sendWeekInCourtForWorkspace(
    workspaceId: string,
): Promise<{ sent: number; skipped: boolean; error?: string }> {
    try {
        const { start, end } = getCurrentWeekRange();

        // Friday of current week
        const friday = new Date(start);
        friday.setDate(start.getDate() + 4);

        // Next Monday
        const nextMonday = new Date(start);
        nextMonday.setDate(start.getDate() + 7);

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                name: true,
                members: { select: { role: true, user: { select: { email: true } } } },
            },
        });
        if (!workspace) return { sent: 0, skipped: true };

        const recipients = workspace.members
            .filter(m => !EXCLUDED_ROLES.has(m.role ?? ''))
            .map(m => m.user.email)
            .filter(Boolean) as string[];
        if (!recipients.length) return { sent: 0, skipped: true };

        const rawEntries = await prisma.calendarEntry.findMany({
            where: {
                type: 'COURT',
                deletedAt: null,
                date: { gte: start, lte: end },
                matter: { workspaceId, deletedAt: null },
            },
            select: {
                date: true,
                court: true,
                judge: true,
                adjournedFor: true,
                adjournedTo: true,
                proceedings: true,
                outcome: true,
                matter: { select: { name: true, court: true, judge: true } },
                appearances: { select: { name: true, email: true } },
            },
            orderBy: { date: 'asc' },
        });

        if (!rawEntries.length) return { sent: 0, skipped: true };

        // Summarise and classify each entry
        const entries: WicEntry[] = await Promise.all(rawEntries.map(async e => {
            const rawText = (e.outcome && e.outcome.trim()) ? e.outcome : (e.proceedings ?? '');
            const summary = await summarise(rawText);
            const lower = rawText.toLowerCase();

            let status: WicEntry['status'] = 'normal';
            if (/did not sit|did not hold/i.test(lower)) status = 'did_not_sit';
            else if (/discontinu/i.test(lower)) status = 'discontinued';
            else if (/judgment/i.test(lower)) status = 'judgment';

            const counsel = e.appearances.map(a => a.name || a.email || '').filter(Boolean);

            return {
                date: e.date,
                matterName: e.matter?.name ?? 'Untitled Matter',
                court: e.court || e.matter?.court || null,
                judge: e.judge || e.matter?.judge || null,
                summary,
                adjournedTo: e.adjournedTo,
                adjournedFor: e.adjournedFor || null,
                counsel,
                status,
            };
        }));

        const byDay = new Map<string, WicEntry[]>();
        for (const e of entries) {
            const k = dayKey(e.date);
            if (!byDay.has(k)) byDay.set(k, []);
            byDay.get(k)!.push(e);
        }

        const html = buildWicHtml(workspace.name, friday, byDay, nextMonday);
        const subject = `The Week in Court — ${workspace.name}, w/e ${fmtDateShort(friday)}`;

        await mailService.send({ to: recipients, subject, html, from: 'Reforma <noreply@reforma.ng>' });
        return { sent: recipients.length, skipped: false };

    } catch (error: any) {
        return { sent: 0, skipped: false, error: error?.message };
    }
}

export async function sendWeekInCourtAllWorkspaces() {
    const allowedIds = config.DIGEST_WORKSPACE_IDS
        ? config.DIGEST_WORKSPACE_IDS.split(',').map(s => s.trim()).filter(Boolean)
        : null;

    const workspaces = await prisma.workspace.findMany({
        where: allowedIds ? { id: { in: allowedIds } } : undefined,
        select: { id: true },
    });

    return Promise.allSettled(workspaces.map(w => sendWeekInCourtForWorkspace(w.id)));
}
