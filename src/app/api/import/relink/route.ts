import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const STOPWORDS = new Set(['the','and','for','re','fwd','fwd:','re:','to','of','in','on','a','an','v','vs','v.','attn','prof','mr','mrs','ms','dr','hon','update','letter','brief','case','matter','file','dear','attention','atten','direct','hoc','prof:']);

function keywords(text: string): string[] {
    return text.toUpperCase()
        .replace(/[^A-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w.toLowerCase()));
}

function matchScore(subject: string, caseName: string): number {
    const subjectWords = keywords(subject);
    const caseWords    = keywords(caseName);
    if (subjectWords.length === 0 || caseWords.length === 0) return 0;
    const hits = subjectWords.filter(w => caseWords.some(c => c.includes(w) || w.includes(c)));
    return hits.length / Math.max(subjectWords.length, caseWords.length);
}

function findBestMatch(
    subject: string,
    matters: Array<{ id: string; name: string }>,
    briefs:  Array<{ id: string; name: string; briefNumber: string; matterId: string | null }>,
): { type: 'MATTER' | 'BRIEF' | null; id: string | null; name: string; score: number } {
    let best = { type: null as 'MATTER' | 'BRIEF' | null, id: null as string | null, name: '', score: 0 };

    for (const m of matters) {
        const score = matchScore(subject, m.name);
        if (score > best.score) best = { type: 'MATTER', id: m.id, name: m.name, score };
    }
    for (const b of briefs) {
        const score = matchScore(subject, b.name);
        if (score > best.score) best = { type: 'BRIEF', id: b.id, name: b.name, score };
    }

    return best;
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

    const briefList  = briefCandidates.map(b => ({ id: b.id, name: b.name, briefNumber: b.briefNumber, clientName: b.client?.name || '', matterId: b.matterId }));
    const matterList = matterCandidates.map(m => ({ id: m.id, name: m.name, caseNumber: m.caseNumber }));

    const matches = emails.map(e => ({
        emailId:    e.id,
        subject:    e.subject ?? '',
        ...findBestMatch(e.subject ?? '', matterList, briefList),
    }));

    let linked = 0, skipped = 0;
    const results: Array<{ subject: string; matched: string | null; confidence: number }> = [];

    // Build update maps — group by matterId for batch writes
    const emailToMatter: Record<string, string> = {};   // emailId → matterId
    const emailToBrief:  Record<string, { briefId: string; matterId: string | null }> = {};

    const THRESHOLD = 0.35;

    for (const match of matches) {
        const subject = match.subject.slice(0, 65);

        if (!match.id || !match.type || match.score < THRESHOLD) {
            skipped++;
            results.push({ subject, matched: null, confidence: Math.round(match.score * 100) / 100 });
            continue;
        }

        if (match.type === 'BRIEF') {
            const brief = briefList.find(b => b.id === match.id);
            if (brief) {
                emailToBrief[match.emailId] = { briefId: brief.id, matterId: brief.matterId ?? null };
                results.push({ subject, matched: `BRIEF: ${brief.name}`, confidence: match.score });
                linked++;
            }
        } else if (match.type === 'MATTER') {
            const matter = matterList.find(m => m.id === match.id);
            if (matter) {
                emailToMatter[match.emailId] = matter.id;
                results.push({ subject, matched: `MATTER: ${matter.name}`, confidence: match.score });
                linked++;
            }
        }
    }

    // Batch all DB writes using $transaction with raw updates
    const matterEmailIds  = Object.keys(emailToMatter);
    const briefEmailIds   = Object.keys(emailToBrief);

    if (matterEmailIds.length > 0 || briefEmailIds.length > 0) {
        // Group matter-only updates by matterId for efficient updateMany
        const matterGroups: Record<string, string[]> = {};
        for (const [emailId, matterId] of Object.entries(emailToMatter)) {
            if (!matterGroups[matterId]) matterGroups[matterId] = [];
            matterGroups[matterId].push(emailId);
        }

        await Promise.all([
            // Update InboundEmail matter links
            ...Object.entries(matterGroups).map(([matterId, ids]) =>
                prisma.inboundEmail.updateMany({ where: { id: { in: ids } }, data: { matterId } })
            ),
            // Update brief-matched emails
            ...Object.entries(emailToBrief).map(([emailId, { matterId }]) =>
                prisma.inboundEmail.update({ where: { id: emailId }, data: { matterId: matterId ?? undefined } })
            ),
            // Update PulseEvents for matter matches
            ...Object.entries(matterGroups).map(([matterId, ids]) =>
                prisma.pulseEvent.updateMany({ where: { inboundEmailId: { in: ids } }, data: { matterId } })
            ),
            // Update PulseEvents for brief matches
            ...Object.entries(emailToBrief).map(([emailId, { briefId, matterId }]) =>
                prisma.pulseEvent.updateMany({ where: { inboundEmailId: emailId }, data: { briefId, matterId: matterId ?? undefined } })
            ),
        ]);
    }

    return NextResponse.json({ linked, skipped, total: emails.length, results });
}

export async function GET() {
    return NextResponse.json({ endpoint: 'POST /api/import/relink', description: 'Bulk re-match unlinked emails to matters/briefs in one Claude call' });
}
