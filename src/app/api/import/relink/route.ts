import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth } from '@/lib/api-auth';
import { identifyBriefFromContent, BriefCandidate, MatterCandidate } from '@/lib/services/email-processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;
    const workspaceId = auth!.workspaceId;

    const emails = await prisma.inboundEmail.findMany({
        where: { workspaceId, matterId: null, clientId: null },
        select: { id: true, subject: true, body: true, bodyPreview: true },
        orderBy: { receivedAt: 'desc' },
        take: 100,
    });

    const [briefCandidates, matterCandidates] = await Promise.all([
        prisma.brief.findMany({
            where: { workspaceId, deletedAt: null },
            select: { id: true, name: true, briefNumber: true, client: { select: { name: true } } },
        }),
        prisma.matter.findMany({
            where: { workspaceId, deletedAt: null },
            select: { id: true, name: true, caseNumber: true, status: true },
        }),
    ]);

    const briefList: BriefCandidate[]  = briefCandidates.map(b => ({ id: b.id, name: b.name, briefNumber: b.briefNumber, clientName: b.client?.name || 'No Client' }));
    const matterList: MatterCandidate[] = matterCandidates.map(m => ({ id: m.id, name: m.name, caseNumber: m.caseNumber, status: m.status }));

    let linked = 0, skipped = 0;
    const results: Array<{ subject: string; matched: string | null; confidence: number }> = [];

    for (const email of emails) {
        const subject = email.subject || '';
        const body = email.body || email.bodyPreview || '';

        const identification = await identifyBriefFromContent(subject, body, briefList, matterList);

        if (identification.confidence < 0.5 || (!identification.briefId && !identification.matterId)) {
            skipped++;
            results.push({ subject: subject.slice(0, 60), matched: null, confidence: identification.confidence });
            continue;
        }

        if (identification.briefId) {
            const brief = await prisma.brief.findFirst({ where: { id: identification.briefId, workspaceId }, select: { id: true, name: true, matterId: true } });
            if (brief) {
                await prisma.inboundEmail.update({ where: { id: email.id }, data: { matterId: brief.matterId ?? undefined } });
                await prisma.pulseEvent.updateMany({ where: { inboundEmailId: email.id }, data: { briefId: brief.id, matterId: brief.matterId ?? undefined } });
                results.push({ subject: subject.slice(0, 60), matched: `BRIEF: ${brief.name}`, confidence: identification.confidence });
                linked++;
            }
        } else if (identification.matterId) {
            const matter = await prisma.matter.findFirst({ where: { id: identification.matterId, workspaceId }, select: { id: true, name: true } });
            if (matter) {
                await prisma.inboundEmail.update({ where: { id: email.id }, data: { matterId: matter.id } });
                await prisma.pulseEvent.updateMany({ where: { inboundEmailId: email.id }, data: { matterId: matter.id } });
                results.push({ subject: subject.slice(0, 60), matched: `MATTER: ${matter.name}`, confidence: identification.confidence });
                linked++;
            }
        }
    }

    return NextResponse.json({ linked, skipped, total: emails.length, results });
}

export async function GET() {
    return NextResponse.json({ endpoint: 'POST /api/import/relink', description: 'Re-run matter/brief matching on unlinked emails' });
}
