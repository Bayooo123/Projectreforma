import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { assertWorkspaceMember } from '@/lib/workspace-guard';

export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const query       = searchParams.get('q');
        const workspaceId = searchParams.get('workspaceId');

        if (!query || query.length < 2) {
            return NextResponse.json({ results: [] });
        }
        if (!workspaceId) {
            return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
        }

        // ── Multi-tenancy gate ────────────────────────────────────────────────
        // Verify the caller belongs to this workspace before returning any data.
        try {
            await assertWorkspaceMember(workspaceId);
        } catch {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // ── Parallel search across all knowledge layers ───────────────────────
        const q = { contains: query, mode: 'insensitive' as const };

        const [documents, briefs, matters, clients, pulseEvents, emails] = await Promise.all([
            // 1. Documents — filename + OCR text
            prisma.document.findMany({
                where: {
                    brief: { workspaceId },
                    OR: [{ name: q }, { ocrText: q }],
                },
                include: {
                    brief: { select: { id: true, name: true, briefNumber: true } },
                },
                take: 15,
            }),

            // 2. Briefs — name, number, description
            prisma.brief.findMany({
                where: {
                    workspaceId,
                    deletedAt: null,
                    OR: [{ name: q }, { briefNumber: q }, { description: q }],
                },
                select: { id: true, name: true, briefNumber: true, status: true },
                take: 10,
            }),

            // 3. Matters — name, case number, court
            prisma.matter.findMany({
                where: {
                    workspaceId,
                    deletedAt: null,
                    OR: [{ name: q }, { caseNumber: q }, { court: q }],
                },
                select: { id: true, name: true, caseNumber: true, court: true, status: true },
                take: 10,
            }),

            // 4. Clients — name, company, email
            prisma.client.findMany({
                where: {
                    workspaceId,
                    deletedAt: null,
                    OR: [{ name: q }, { company: q }, { email: q }],
                },
                select: { id: true, name: true, company: true, email: true },
                take: 10,
            }),

            // 5. Institutional memory — PulseEvents (email AI summaries)
            prisma.pulseEvent.findMany({
                where: {
                    workspaceId,
                    OR: [{ title: q }, { summary: q }, { senderEmail: q }, { senderName: q }],
                },
                select: {
                    id: true, title: true, summary: true, intent: true, urgency: true,
                    senderName: true, senderEmail: true, createdAt: true,
                    brief: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),

            // 6. Raw inbound emails — subject + body
            prisma.inboundEmail.findMany({
                where: {
                    workspaceId,
                    OR: [{ subject: q }, { body: q }, { fromEmail: q }, { fromName: q }],
                },
                select: {
                    id: true, subject: true, fromName: true, fromEmail: true,
                    bodyPreview: true, receivedAt: true,
                },
                orderBy: { receivedAt: 'desc' },
                take: 8,
            }),
        ]);

        // ── Format results ───────────────────────────────────────────────────
        const results = [
            ...briefs.map(b => ({
                id: b.id, type: 'brief',
                title: b.name,
                subtitle: `Brief ${b.briefNumber} · ${b.status}`,
                url: `/briefs/${b.id}`,
                matchType: 'Brief',
            })),

            ...matters.map(m => ({
                id: m.id, type: 'matter',
                title: m.name,
                subtitle: [m.caseNumber, m.court, m.status].filter(Boolean).join(' · '),
                url: `/management/clients`,
                matchType: 'Matter',
            })),

            ...clients.map(c => ({
                id: c.id, type: 'client',
                title: c.name,
                subtitle: [c.company, c.email].filter(Boolean).join(' · '),
                url: `/management/clients`,
                matchType: 'Client',
            })),

            ...pulseEvents.map(p => {
                const text = p.summary || '';
                const idx  = text.toLowerCase().indexOf(query.toLowerCase());
                const snippet = idx !== -1
                    ? (idx > 30 ? '…' : '') + text.substring(Math.max(0, idx - 30), idx + query.length + 60) + (idx + 60 < text.length ? '…' : '')
                    : text.substring(0, 100);
                return {
                    id: p.id, type: 'pulse',
                    title: p.title,
                    subtitle: `${p.senderName || p.senderEmail} · ${p.intent} · ${new Date(p.createdAt).toLocaleDateString('en-NG')}`,
                    url: p.brief ? `/briefs/${p.brief.id}` : `/pulse`,
                    snippet,
                    matchType: 'Email Intelligence',
                };
            }),

            ...emails.map(e => ({
                id: e.id, type: 'email',
                title: e.subject,
                subtitle: `From: ${e.fromName || e.fromEmail} · ${new Date(e.receivedAt).toLocaleDateString('en-NG')}`,
                url: `/pulse`,
                snippet: e.bodyPreview ? e.bodyPreview.substring(0, 120) : undefined,
                matchType: 'Inbound Email',
            })),

            ...documents.map(d => {
                const text  = d.ocrText || '';
                const idx   = text.toLowerCase().indexOf(query.toLowerCase());
                let snippet = '';
                if (idx !== -1) {
                    const start = Math.max(0, idx - 40);
                    const end   = Math.min(text.length, idx + query.length + 60);
                    snippet = (start > 0 ? '…' : '') + text.substring(start, end).replace(/\n/g, ' ') + (end < text.length ? '…' : '');
                }
                return {
                    id: d.id, type: 'document',
                    title: d.name,
                    subtitle: `Brief: ${d.brief.name}`,
                    url: `/briefs/${d.brief.id}?doc=${d.id}`,
                    snippet,
                    matchType: d.name.toLowerCase().includes(query.toLowerCase()) ? 'Document' : 'Document Content',
                };
            }),
        ];

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('[Search API] Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
