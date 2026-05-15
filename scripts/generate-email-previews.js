// @ts-check
const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
require('dotenv').config();

const ai = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

// Extract key legal sentences from long court notes, preserving names
function extractKeySentences(text) {
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
        // Preserve sentences with names (Mr./Mrs./Miss/Prof./SAN) — these are factual
        if (/\b(Mr|Mrs|Miss|Ms|Prof|Dr|Alhaji|Chief|Hon)\b\.?\s+[A-Z]/u.test(s)) score += 4;
        if (/\bSAN\b/.test(s)) score += 3;
        if (/appear|present|counsel|watching brief/i.test(lower)) score += 2;
        if (/witness|health|deteriorat/i.test(lower)) score += 3;
        return { s, score };
    });

    // Always include first sentence + top 2 by score, max 3 total
    const first = sentences[0];
    const rest = scored
        .filter(x => x.s !== first)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(x => x.s);

    // Re-order to match original flow
    const picked = new Set([first, ...rest]);
    const ordered = sentences.filter(s => picked.has(s));
    return ordered.join(' ');
}

// Use Claude if available, otherwise fall back to extraction
async function summarise(text) {
    if (!text || text.trim().length < 300) return text.trim();
    if (ai) {
        try {
            const msg = await ai.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 150,
                messages: [{
                    role: 'user',
                    content: `Summarise the following Nigerian court proceedings into 2–3 concise sentences for a law firm's internal weekly email. Preserve: orders made, adjournment date/reason, key rulings. Plain professional English, no bullets.\n\n${text.trim()}`,
                }],
            });
            if (msg.content[0].type === 'text') return msg.content[0].text.trim();
        } catch (_) { /* fall through */ }
    }
    return extractKeySentences(text);
}

const prisma = new PrismaClient();
const APP_URL = 'https://reforma.ng';
const WORKSPACE = 'ASCOLP';

function fmtDateShort(d) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function dayKey(d) { return new Date(d).toISOString().split('T')[0]; }
function dayHeading(d) {
    const dt = new Date(d);
    return {
        upper: dt.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase(),
        full: dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
}
function counselTags(appearances, forDigest) {
    const names = appearances.map(a => a.name).filter(Boolean);
    if (!names.length) {
        return forDigest
            ? '<span style="font-size:11.5px;color:#9CA3AF;font-style:italic;">No counsel assigned</span>'
            : '<span style="font-size:11px;color:#9CA3AF;font-style:italic;">No appearance recorded</span>';
    }
    return names.map(c =>
        `<span style="display:inline-block;font-size:11.5px;font-weight:500;color:#065f46;background:#D1FAE5;padding:3px 10px;border-radius:20px;margin:2px 3px 2px 0;">${c}</span>`
    ).join('');
}

// ── WEEKLY DIGEST HTML ──────────────────────────────────────────────────────
function buildDigestHtml(entries) {
    const totalH = entries.length;
    const totalD = new Set(entries.map(e => dayKey(e.date))).size;
    const judgments = entries.filter(e => /judgment|ruling/i.test(e.adjournedFor || e.proceedings || '')).length;
    const weekStart = new Date('2026-05-18');
    const weekEnd = new Date('2026-05-24');
    const weekStr = fmtDateShort(weekStart) + ' – ' + fmtDateShort(weekEnd);

    const byDay = new Map();
    for (const e of entries) {
        const k = dayKey(e.date);
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push(e);
    }

    const daySections = [...byDay.entries()].map(([, dayEntries]) => {
        const { upper, full } = dayHeading(dayEntries[0].date);
        const cards = dayEntries.map(e => {
            const isJ = /judgment|ruling/i.test(e.adjournedFor || e.proceedings || '');
            const jBadge = isJ ? `<div style="display:inline-block;font-size:10.5px;font-weight:600;color:#92400E;background:#FEF3C7;border:1px solid #FCD34D;padding:2px 10px;border-radius:20px;margin-bottom:8px;">&#9878; Judgment</div><br/>` : '';
            const purposeRaw = e.adjournedFor || e.proceedings || '';
            const purposeClean = /to be filled|tbd|n\/a/i.test(purposeRaw) ? '' : purposeRaw;
            const courtParts = [
                e.court || e.matter?.court,
                (e.judge || e.matter?.judge) ? 'Before ' + (e.judge || e.matter?.judge) : null,
                purposeClean,
            ].filter(Boolean).join(' &middot; ');
            return `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr><td style="background:${isJ ? '#FFFBEB' : '#F8FAFC'};border:1px solid ${isJ ? '#FCD34D' : '#E2E8F0'};border-left:4px solid ${isJ ? '#F59E0B' : '#059669'};border-radius:8px;padding:14px 16px;">
                ${jBadge}
                <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:6px;">${e.matter?.name}</div>
                ${courtParts ? `<div style="font-size:12.5px;color:#4B5563;margin-bottom:8px;">${courtParts}</div>` : ''}
                <div>${counselTags(e.appearances, true)}</div>
              </td></tr>
            </table>`;
        }).join('');

        return `
        <tr><td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td style="font-size:11px;font-weight:700;letter-spacing:1.1px;color:#059669;text-transform:uppercase;padding-right:10px;white-space:nowrap;">${upper}</td>
              <td style="font-size:11px;color:#9CA3AF;padding-right:10px;white-space:nowrap;">${full}</td>
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
  <title>${WORKSPACE} Weekly Digest</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px;">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#064e3b;padding:32px 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">Re<span style="color:#6EE7B7;">forma</span></td>
        <td align="right"><span style="font-size:11px;font-weight:500;color:#6EE7B7;letter-spacing:1.2px;text-transform:uppercase;background:rgba(110,231,183,0.12);padding:4px 10px;border-radius:20px;border:1px solid rgba(110,231,183,0.25);">Weekly Digest</span></td>
      </tr>
    </table>
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#fff;line-height:1.2;margin-top:20px;">Court Schedule</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px;">${WORKSPACE} &nbsp;&middot;&nbsp; Week of ${weekStr}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);">
      <tr>
        <td align="center"><div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">${totalH}</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Hearings</div></td>
        <td align="center" style="border-left:1px solid rgba(255,255,255,0.12);border-right:1px solid rgba(255,255,255,0.12);"><div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">${totalD}</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Court Days</div></td>
        <td align="center"><div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">${judgments}</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Judgment${judgments !== 1 ? 's' : ''}</div></td>
      </tr>
    </table>
  </td></tr>

  <!-- Intro -->
  <tr><td style="padding:24px 40px 0;font-size:13.5px;color:#4B5563;line-height:1.75;">
    Good evening. Here are all court appearances scheduled for <strong>${WORKSPACE}</strong> this coming week. Please review the matters assigned to you and ensure all preparations are in order.
  </td></tr>

  ${daySections}

  <!-- Footer -->
  <tr><td style="padding:28px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2E8F0;padding-top:20px;">
      <tr><td style="padding-top:20px;">
        <a href="${APP_URL}" style="display:inline-block;background:#064e3b;color:#fff;font-size:13px;font-weight:500;padding:11px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">Open Reforma Workspace &rarr;</a>
        <div style="font-size:12px;color:#9CA3AF;line-height:1.7;">
          This digest is automatically generated from your firm's live data on Reforma every Friday and Sunday evening.<br/>
          You are receiving this as a member of <strong>${WORKSPACE}</strong>'s workspace on Reforma.
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

// ── WEEK IN COURT HTML ──────────────────────────────────────────────────────
function statusStyle(e) {
    const text = (e.outcome || e.proceedings || '').toLowerCase();
    if (/discontinu/i.test(text)) return { bg: '#EFF6FF', border: '#BFDBFE', left: '#2563EB', badge: '&#9632; Concluded', badgeColor: '#1D4ED8' };
    if (/did not sit|did not hold/i.test(text)) return { bg: '#FFF7ED', border: '#FED7AA', left: '#F97316', badge: '&#9888; Court Did Not Sit', badgeColor: '#C2410C' };
    if (/judgment/i.test(text)) return { bg: '#FFFBEB', border: '#FCD34D', left: '#F59E0B', badge: '&#9878; Judgment', badgeColor: '#92400E' };
    return { bg: '#F8FAFC', border: '#E2E8F0', left: '#059669', badge: '', badgeColor: '' };
}

function buildWicHtml(entries, weekLabel) {
    const scheduledCount = entries.length;
    const withOutcome = entries.filter(e => e.outcome && e.outcome.trim()).length;
    const noSit = entries.filter(e => /did not sit|did not hold/i.test(e.outcome || e.proceedings || '')).length;

    const byDay = new Map();
    for (const e of entries) {
        const k = dayKey(e.date);
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push(e);
    }

    const daySections = [...byDay.entries()].map(([, dayEntries]) => {
        const { upper, full } = dayHeading(dayEntries[0].date);
        const cards = dayEntries.map(e => {
            const s = statusStyle(e);
            const badge = s.badge
                ? `<div style="display:inline-block;font-size:10.5px;font-weight:600;color:${s.badgeColor};background:${s.bg};border:1px solid ${s.border};padding:2px 10px;border-radius:20px;margin-bottom:8px;">${s.badge}</div><br/>`
                : '';
            const courtLine = [
                e.court || e.matter?.court,
                (e.judge || e.matter?.judge) ? 'Before ' + (e.judge || e.matter?.judge) : null,
            ].filter(Boolean).join(' &middot; ');
            const mainText = e.outcome && e.outcome.trim() ? e.outcome.trim() : (e.proceedings && e.proceedings.trim() ? e.proceedings.trim() : '<em style="color:#9CA3AF;">No outcome recorded for this date.</em>');
            const adjLine = e.adjournedTo
                ? `<div style="font-size:11.5px;color:#6B7280;margin-top:8px;">&#8617; Adjourned to: <strong>${fmtDateShort(e.adjournedTo)}${e.adjournedFor ? ' &mdash; ' + e.adjournedFor : ''}</strong></div>`
                : '';
            return `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr><td style="background:${s.bg};border:1px solid ${s.border};border-left:4px solid ${s.left};border-radius:8px;padding:14px 16px;">
                ${badge}
                <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:4px;">${e.matter?.name}</div>
                ${courtLine ? `<div style="font-size:12px;color:#6B7280;margin-bottom:8px;">${courtLine}</div>` : ''}
                <div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:8px;white-space:pre-line;">${mainText}</div>
                ${adjLine}
                <div style="margin-top:8px;">${counselTags(e.appearances, false)}</div>
              </td></tr>
            </table>`;
        }).join('');

        return `
        <tr><td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td style="font-size:11px;font-weight:700;letter-spacing:1.1px;color:#0f172a;text-transform:uppercase;padding-right:10px;white-space:nowrap;">${upper}</td>
              <td style="font-size:11px;color:#9CA3AF;padding-right:10px;white-space:nowrap;">${full}</td>
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
  <title>The Week in Court &mdash; ${WORKSPACE}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#064e3b;padding:32px 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">Re<span style="color:#6EE7B7;">forma</span></td>
        <td align="right"><span style="font-size:11px;font-weight:500;color:#6EE7B7;letter-spacing:1.2px;text-transform:uppercase;background:rgba(110,231,183,0.12);padding:4px 10px;border-radius:20px;border:1px solid rgba(110,231,183,0.25);">The Week in Court</span></td>
      </tr>
    </table>
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#fff;line-height:1.2;margin-top:20px;">${weekLabel}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">${WORKSPACE} &nbsp;&middot;&nbsp; Court Activity Report</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);">
      <tr>
        <td align="center"><div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">${scheduledCount}</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px;">Scheduled</div></td>
        <td align="center" style="border-left:1px solid rgba(255,255,255,0.1);border-right:1px solid rgba(255,255,255,0.1);"><div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">${withOutcome}</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px;">Outcomes Recorded</div></td>
        <td align="center"><div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">${noSit}</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px;">Courts Did Not Sit</div></td>
      </tr>
    </table>
  </td></tr>

  <!-- Intro -->
  <tr><td style="padding:24px 40px 0;">
    <p style="font-size:13.5px;color:#374151;line-height:1.75;margin:0 0 16px;">
      Reforma serves as the digital operating workspace for Nigerian law firms. In the course of the week ended <strong>${weekLabel}</strong>, the following matters were scheduled to come up before various courts. Continue reading to find out what transpired in each case.
    </p>
    <div style="background:#FEF9C3;border:1px solid #FDE047;border-left:4px solid #EAB308;border-radius:8px;padding:12px 16px;font-size:12.5px;color:#713F12;line-height:1.65;">
      <strong>Please note:</strong> Reforma bears no liability for inaccuracies arising from data entered by users into the system. Should you notice any error in the report below, you may correct it directly from your workspace.
    </div>
  </td></tr>

  ${daySections}

  <!-- New week callout -->
  <tr><td style="padding:24px 40px 0;">
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #22C55E;border-radius:8px;padding:14px 16px;font-size:13px;color:#166534;line-height:1.65;">
      A new week begins on <strong>Monday, 18 May 2026</strong>. Find out what is scheduled across your firm in the <strong>Weekly Digest</strong> sent to you this evening.
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2E8F0;padding-top:20px;">
      <tr><td style="padding-top:20px;">
        <a href="${APP_URL}" style="display:inline-block;background:#064e3b;color:#fff;font-size:13px;font-weight:500;padding:11px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">Open Your Workspace &rarr;</a>
        <div style="font-size:12px;color:#9CA3AF;line-height:1.7;">
          This report is automatically compiled from court records entered on Reforma during the week. Matters with missing outcomes should be updated by the assigned lawyer before the next digest.<br/>
          You are receiving this as a member of <strong>${WORKSPACE}</strong>'s workspace.
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

async function main() {
    // Weekly Digest — next week
    const digestEntries = await prisma.calendarEntry.findMany({
        where: { type: 'COURT', deletedAt: null, date: { gte: new Date('2026-05-18'), lte: new Date('2026-05-24T23:59:59') }, matter: { workspace: { name: WORKSPACE } } },
        select: { date: true, court: true, judge: true, adjournedFor: true, proceedings: true, matter: { select: { name: true, court: true, judge: true } }, appearances: { select: { name: true } } },
        orderBy: { date: 'asc' },
    });

    // Week in Court — current week
    const wicEntries = await prisma.calendarEntry.findMany({
        where: { type: 'COURT', deletedAt: null, date: { gte: new Date('2026-05-11'), lte: new Date('2026-05-17T23:59:59') } },
        select: { date: true, court: true, judge: true, adjournedFor: true, adjournedTo: true, proceedings: true, outcome: true, matter: { select: { name: true, court: true, judge: true, workspace: { select: { name: true } } } }, appearances: { select: { name: true } } },
        orderBy: { date: 'asc' },
    });

    const ascolpWic = wicEntries.filter(e => e.matter?.workspace?.name === WORKSPACE);

    // Summarise long outcomes/proceedings for the Week in Court email
    console.log('Summarising long entries via Claude...');
    const summarised = await Promise.all(ascolpWic.map(async (e) => {
        const raw = e.outcome && e.outcome.trim() ? e.outcome : e.proceedings;
        const summary = await summarise(raw);
        return { ...e, outcome: summary, proceedings: summary };
    }));
    console.log('Done summarising.');

    fs.writeFileSync('preview-weekly-digest.html', buildDigestHtml(digestEntries));
    console.log('✓ preview-weekly-digest.html written');

    fs.writeFileSync('preview-week-in-court.html', buildWicHtml(summarised, 'Week Ended Friday, 16 May 2026'));
    console.log('✓ preview-week-in-court.html written');

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
