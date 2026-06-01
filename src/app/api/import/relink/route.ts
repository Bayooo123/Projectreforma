import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth } from '@/lib/api-auth';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// One Claude call with ALL subjects — returns a bulk mapping
async function bulkMatch(
    emails: Array<{ id: string; subject: string }>,
    matters: Array<{ id: string; name: string; caseNumber: string | null }>,
    briefs: Array<{ id: string; name: string; briefNumber: string; clientName: string }>,
): Promise<Array<{ emailId: string; type: 'MATTER' | 'BRIEF' | null; id: string | null; confidence: number }>> {
    const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

    const emailLines = emails.map((e, i) => `${i}: ${e.subject}`).join('\n');
    const matterLines = matters.map(m => `MATTER|${m.id}|${m.caseNumber ? m.caseNumber + ' — ' : ''}${m.name}`).join('\n');
    const briefLines  = briefs.map(b => `BRIEF|${b.id}|${b.briefNumber} — ${b.name} (${b.clientName})`).join('\n');

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
            role: 'user',
            content: `You are a routing assistant for a Nigerian law firm. Match each email subject to the best case below.

Party names in subjects are often shortened (e.g. "RCCG" matches any RCCG matter, "ODUMOSU" is a party surname, "HOMAL" may be an abbreviation, "CHI" or "CHECKPOINT" may match "Chi v. FIRS").

EMAIL SUBJECTS (index: subject):
${emailLines}

CASES (TYPE|ID|LABEL):
${matterLines}
${briefLines}

Return a JSON array — one entry per email, in the same order:
[{"idx": 0, "type": "MATTER"|"BRIEF"|null, "id": "<case id or null>", "confidence": 0.0-1.0}, ...]

Only match with confidence >= 0.5. Use null for no match or ambiguous emails (testing, password reset, general research).`,
        }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '[]';
    const clean = text.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    const parsed: Array<{ idx: number; type: string | null; id: string | null; confidence: number }> = JSON.parse(clean);

    return parsed.map(p => ({
        emailId:    emails[p.idx]?.id ?? '',
        type:       (p.type as 'MATTER' | 'BRIEF' | null),
        id:         p.id,
        confidence: p.confidence,
    }));
}

export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;
    const workspaceId = auth!.workspaceId;

    const [emails, briefCandidates, matterCandidates] = await Promise.all([
        prisma.inboundEmail.findMany({
            where: { workspaceId, matterId: null, clientId: null },
            select: { id: true, subject: true },
            orderBy: { receivedAt: 'desc' },
            take: 150,
        }),
        prisma.brief.findMany({
            where: { workspaceId, deletedAt: null },
            select: { id: true, name: true, briefNumber: true, matterId: true, client: { select: { name: true } } },
        }),
        prisma.matter.findMany({
            where: { workspaceId, deletedAt: null },
            select: { id: true, name: true, caseNumber: true },
        }),
    ]);

    if (emails.length === 0) return NextResponse.json({ linked: 0, skipped: 0, total: 0, results: [] });

    const briefList = briefCandidates.map(b => ({ id: b.id, name: b.name, briefNumber: b.briefNumber, clientName: b.client?.name || '', matterId: b.matterId }));
    const matterList = matterCandidates.map(m => ({ id: m.id, name: m.name, caseNumber: m.caseNumber }));

    const matches = await bulkMatch(emails, matterList, briefList);

    let linked = 0, skipped = 0;
    const results: Array<{ subject: string; matched: string | null; confidence: number }> = [];

    for (const match of matches) {
        const email = emails.find(e => e.id === match.emailId);
        const subject = email?.subject?.slice(0, 65) ?? '';

        if (!match.id || !match.type || match.confidence < 0.5) {
            skipped++;
            results.push({ subject, matched: null, confidence: match.confidence ?? 0 });
            continue;
        }

        if (match.type === 'BRIEF') {
            const brief = briefList.find(b => b.id === match.id);
            if (brief) {
                await prisma.inboundEmail.update({ where: { id: match.emailId }, data: { matterId: brief.matterId ?? undefined } });
                await prisma.pulseEvent.updateMany({ where: { inboundEmailId: match.emailId }, data: { briefId: brief.id, matterId: brief.matterId ?? undefined } });
                results.push({ subject, matched: `BRIEF: ${brief.name}`, confidence: match.confidence });
                linked++;
            }
        } else if (match.type === 'MATTER') {
            const matter = matterList.find(m => m.id === match.id);
            if (matter) {
                await prisma.inboundEmail.update({ where: { id: match.emailId }, data: { matterId: matter.id } });
                await prisma.pulseEvent.updateMany({ where: { inboundEmailId: match.emailId }, data: { matterId: matter.id } });
                results.push({ subject, matched: `MATTER: ${matter.name}`, confidence: match.confidence });
                linked++;
            }
        }
    }

    return NextResponse.json({ linked, skipped, total: emails.length, results });
}

export async function GET() {
    return NextResponse.json({ endpoint: 'POST /api/import/relink', description: 'Bulk re-match unlinked emails to matters/briefs in one Claude call' });
}
