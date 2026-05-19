import { prisma } from '@/lib/prisma';
import { mailService } from '@/lib/services/mail/mail';
import { config } from '@/lib/config';

function getNextWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = ((8 - dayOfWeek) % 7) || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
}

interface DigestEntry {
    date: Date;
    matterName: string;
    court: string | null;
    purpose: string;
    judge: string | null;
    counsel: string[];
    isJudgment: boolean;
}


function buildHtml(workspaceName: string, weekStart: Date, weekEnd: Date, byDay: Map<string, DigestEntry[]>): string {
    const appUrl = config.NEXT_PUBLIC_APP_URL;
    const totalHearings = [...byDay.values()].reduce((sum, d) => sum + d.length, 0);
    const totalDays = byDay.size;
    const judgments = [...byDay.values()].flat().filter(e => e.isJudgment).length;

    const weekStr = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    const daySections = [...byDay.entries()].map(([, entries]) => {
        const dayDate = entries[0].date;
        const dayHeading = dayDate.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
        const dayFull = dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        const cards = entries.map(entry => {
            const counselTags = entry.counsel.map(c =>
                `<span style="display:inline-block;font-size:11.5px;font-weight:500;color:#065f46;background:#D1FAE5;padding:2px 9px;border-radius:20px;margin:2px 3px 2px 0;">${c}</span>`
            ).join('');

            const judgmentBadge = entry.isJudgment
                ? `<div style="display:inline-block;font-size:10.5px;font-weight:600;color:#92400E;background:#FEF3C7;border:1px solid #FCD34D;padding:2px 10px;border-radius:20px;margin-bottom:8px;">⚖ Judgment</div>`
                : '';

            const courtLine = [entry.court, entry.judge ? `Before ${entry.judge}` : null, entry.purpose]
                .filter(Boolean).join(' · ');

            return `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr>
                <td style="background:${entry.isJudgment ? '#FFFBEB' : '#F8FAFC'};border:1px solid ${entry.isJudgment ? '#FCD34D' : '#E2E8F0'};border-left:3px solid ${entry.isJudgment ? '#F59E0B' : '#059669'};border-radius:8px;padding:14px 16px;">
                  ${judgmentBadge}
                  <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:6px;line-height:1.35;">${entry.matterName}</div>
                  ${courtLine ? `<div style="font-size:12.5px;color:#4B5563;margin-bottom:6px;">${courtLine}</div>` : ''}
                  <div>${counselTags}</div>
                </td>
              </tr>
            </table>`;
        }).join('');

        return `
        <tr><td style="padding:24px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td style="font-size:11px;font-weight:600;letter-spacing:1.1px;color:#059669;text-transform:uppercase;padding-right:10px;white-space:nowrap;">${dayHeading}</td>
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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${workspaceName} Weekly Court Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:none;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#064e3b;padding:32px 40px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">Re<span style="color:#6EE7B7;">forma</span></td>
              <td align="right"><span style="font-size:11px;font-weight:500;color:#6EE7B7;letter-spacing:1.2px;text-transform:uppercase;background:rgba(110,231,183,0.12);padding:4px 10px;border-radius:20px;border:1px solid rgba(110,231,183,0.25);">Weekly Digest</span></td>
            </tr>
          </table>
          <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#ffffff;line-height:1.2;margin-top:20px;">Court Schedule</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px;">${workspaceName} &nbsp;·&nbsp; Week of ${weekStr}</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);">
            <tr>
              <td align="center">
                <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;line-height:1;">${totalHearings}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Hearings</div>
              </td>
              <td align="center" style="border-left:1px solid rgba(255,255,255,0.12);border-right:1px solid rgba(255,255,255,0.12);">
                <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;line-height:1;">${totalDays}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Court Days</div>
              </td>
              <td align="center">
                <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#ffffff;line-height:1;">${judgments}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;">Judgment${judgments !== 1 ? 's' : ''}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:24px 40px 0;font-size:13.5px;color:#4B5563;line-height:1.7;">
          Good evening. Here are all court appearances scheduled for <strong>${workspaceName}</strong> this coming week. Please review the matters assigned to you and ensure all preparations are in order.
        </td></tr>

        <!-- Day sections -->
        ${daySections}

        <!-- Footer -->
        <tr><td style="padding:28px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2E8F0;padding-top:20px;">
            <tr><td style="padding-top:20px;">
              <a href="${appUrl}" style="display:inline-block;background:#064e3b;color:#ffffff;font-size:13px;font-weight:500;padding:11px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">Open Reforma Workspace →</a>
              <div style="font-size:12px;color:#9CA3AF;line-height:1.7;">
                This digest is automatically generated from your firm's live data on Reforma every Friday and Sunday evening.<br />
                You are receiving this as a member of <strong>${workspaceName}</strong>'s workspace on Reforma.
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;padding-top:16px;border-top:1px solid #F1F5F9;">
                <tr>
                  <td>
                    <span style="display:inline-block;width:8px;height:8px;background:#059669;border-radius:50%;margin-right:8px;vertical-align:middle;"></span>
                    <span style="font-family:Georgia,serif;font-size:13px;font-weight:600;color:#064e3b;vertical-align:middle;">Reforma</span>
                  </td>
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

export async function sendWeeklyDigestForWorkspace(workspaceId: string): Promise<{ sent: number; skipped: boolean; error?: string }> {
    try {
        const { start, end } = getNextWeekRange();

        const EXCLUDED_ROLES = new Set(['viewer', 'admin', 'paralegal']);

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

        const entries = await prisma.calendarEntry.findMany({
            where: {
                matter: { workspaceId, deletedAt: null },
                type: 'COURT',
                date: { gte: start, lte: end },
            },
            select: {
                date: true,
                court: true,
                adjournedFor: true,
                proceedings: true,
                judge: true,
                matter: {
                    select: {
                        id: true,
                        name: true,
                        court: true,
                        judge: true,
                        lawyerInCharge: { select: { name: true } },
                    },
                },
            },
            orderBy: { date: 'asc' },
        });

        if (!entries.length) return { sent: 0, skipped: true };

        const enriched: DigestEntry[] = [];
        for (const entry of entries) {
            if (!entry.matter) continue;
            const lastAppearance = await prisma.calendarEntry.findFirst({
                where: { matterId: entry.matter.id, appearances: { some: {} }, date: { lt: new Date() } },
                orderBy: { date: 'desc' },
                select: { appearances: { select: { name: true, email: true } } },
            }) ?? await prisma.calendarEntry.findFirst({
                where: { matterId: entry.matter.id, appearances: { some: {} } },
                orderBy: { date: 'asc' },
                select: { appearances: { select: { name: true, email: true } } },
            });

            const counsel = lastAppearance?.appearances.map(a => a.name || a.email || '').filter(Boolean) ?? [];
            const rawPurpose = entry.adjournedFor || entry.proceedings || '';
            const purpose = /to be filled|tbd|n\/a/i.test(rawPurpose) ? '' : rawPurpose;
            const isJudgment = /judgment|ruling/i.test(purpose);

            enriched.push({
                date: entry.date,
                matterName: entry.matter.name,
                court: entry.court || entry.matter.court,
                purpose,
                judge: entry.judge || entry.matter.judge,
                counsel: counsel.length ? counsel : (entry.matter.lawyerInCharge?.name ? [entry.matter.lawyerInCharge.name] : []),
                isJudgment,
            });
        }

        const byDay = new Map<string, DigestEntry[]>();
        for (const entry of enriched) {
            const key = entry.date.toISOString().split('T')[0];
            if (!byDay.has(key)) byDay.set(key, []);
            byDay.get(key)!.push(entry);
        }

        const html = buildHtml(workspace.name, start, end, byDay);
        const subject = `Your Firm's Court Schedule — Week of ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

        await mailService.send({ to: recipients, subject, html, from: 'Reforma <noreply@reforma.ng>' });
        return { sent: recipients.length, skipped: false };

    } catch (error: any) {
        return { sent: 0, skipped: false, error: error?.message };
    }
}

export async function sendWeeklyDigestAllWorkspaces() {
    const allowedIds = config.DIGEST_WORKSPACE_IDS
        ? config.DIGEST_WORKSPACE_IDS.split(',').map(s => s.trim()).filter(Boolean)
        : null;

    const workspaces = await prisma.workspace.findMany({
        where: allowedIds ? { id: { in: allowedIds } } : undefined,
        select: { id: true },
    });

    const results = await Promise.allSettled(workspaces.map(w => sendWeeklyDigestForWorkspace(w.id)));
    return results;
}
