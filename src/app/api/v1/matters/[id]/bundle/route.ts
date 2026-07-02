import { NextRequest, NextResponse } from 'next/server';
import { zipSync, strToU8 } from 'fflate';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Bundle generation can take time for large matters with many documents
export const maxDuration = 60;

function sanitizePath(name: string): string {
    return name.replace(/[^\w.\-]/g, '_').substring(0, 80);
}

function buildPlaybookPrompt(matterName: string, caseNumber: string | null, briefCount: number, docCount: number, workEntryCount: number): string {
    return `# Playbook Generation Prompt — ${matterName}${caseNumber ? ` (${caseNumber})` : ''}

You are analyzing a complete legal matter bundle for "${matterName}".

## Bundle Contents
- manifest.json        — Matter overview, client, counsel, and briefs index
- proceedings.json     — Court hearings and proceedings chronology (${briefCount > 0 ? 'court history' : 'no proceedings recorded'})
- work-log.json        — All lawyer work entries start-to-finish (${workEntryCount} entries)
- documents/           — All case documents organized by brief/phase (${docCount} files)
  - Each brief folder contains the actual documents and extracted text (.txt) where available

## Your Task: Generate a PLAYBOOK

Analyze all files in this bundle and produce a structured playbook that captures how the firm
handled this type of matter from start to finish. The playbook becomes a reusable knowledge
asset for future similar matters.

### Playbook Sections Required

1. **MATTER TYPE & SCOPE**
   - What type of legal matter is this? (litigation, transactional, advisory, etc.)
   - What is the firm's core deliverable to the client?
   - What legal domain and jurisdiction applies?

2. **PHASE BREAKDOWN**
   - List each distinct phase of the matter in order
   - For each phase: what triggered it, what work was done, what was produced
   - Use the work-log.json dates and descriptions to identify phases

3. **DOCUMENT MAP**
   - What documents are produced in each phase?
   - Which are internal working documents vs. client-facing vs. filed with court?
   - Template documents to create for future matters

4. **DECISION POINTS**
   - Where are the critical judgment calls in this type of matter?
   - What information/research is needed before each decision?
   - What are the risk factors the firm watches for?

5. **TIME ESTIMATES**
   - Based on work-log.json, how long does each phase typically take?
   - What is the typical total duration for this matter type?
   - Which tasks are time-sensitive or deadline-driven?

6. **STANDARD CHECKLIST**
   - Produce a reusable checkbox checklist a lawyer can follow for similar matters
   - Group by phase

7. **BEST PRACTICES & LESSONS**
   - What patterns from this matter should be replicated?
   - What would you do differently based on how the work unfolded?

Output the playbook in structured Markdown. Use clear headings and bullet points so it can be
saved directly as a firm knowledge document.
`;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const workspaceId = session.user.workspaceId;

    if (!workspaceId) {
        return NextResponse.json({ error: 'No active workspace' }, { status: 403 });
    }

    const matter = await prisma.matter.findFirst({
        where: { id, workspaceId, deletedAt: null },
        include: {
            client: { select: { id: true, name: true, email: true } },
            lawyers: {
                include: { lawyer: { select: { id: true, name: true, email: true } } },
            },
            calendarEntries: {
                where: { deletedAt: null },
                orderBy: { date: 'asc' },
                include: {
                    appearances: { select: { id: true, name: true, email: true } },
                },
            },
            briefs: {
                include: {
                    documents: {
                        orderBy: [{ version: 'desc' }, { uploadedAt: 'desc' }],
                    },
                    workEntries: {
                        include: { user: { select: { id: true, name: true } } },
                        orderBy: { date: 'asc' },
                    },
                },
            },
        },
    });

    if (!matter) {
        return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    const files: Record<string, Uint8Array> = {};

    // manifest.json
    const totalDocs = matter.briefs.reduce((n, b) => n + b.documents.length, 0);
    const totalWork = matter.briefs.reduce((n, b) => n + b.workEntries.length, 0);

    const manifest = {
        generatedAt: new Date().toISOString(),
        matter: {
            id: matter.id,
            name: matter.name,
            caseNumber: matter.caseNumber,
            court: matter.court,
            judge: matter.judge,
            status: matter.status,
            client: matter.client,
            lawyers: matter.lawyers.map(l => ({
                ...l.lawyer,
                role: l.role,
                isAppearing: l.isAppearing,
            })),
        },
        briefs: matter.briefs.map(b => ({
            id: b.id,
            briefNumber: b.briefNumber,
            name: b.name,
            status: b.status,
            category: b.category,
            documentCount: b.documents.length,
            workEntryCount: b.workEntries.length,
        })),
        summary: {
            totalBriefs: matter.briefs.length,
            totalDocuments: totalDocs,
            totalWorkEntries: totalWork,
            totalProceedings: matter.calendarEntries.length,
        },
    };
    files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

    // proceedings.json
    const proceedings = matter.calendarEntries.map(e => ({
        date: e.date,
        type: e.type,
        title: e.title,
        court: e.court,
        judge: e.judge,
        proceedings: e.proceedings,
        outcome: e.outcome,
        adjournedFor: e.adjournedFor,
        adjournedTo: e.adjournedTo,
        externalCounsel: e.externalCounsel,
        location: e.location,
        agenda: e.agenda,
        appearances: e.appearances.map(a => ({ name: a.name, email: a.email })),
    }));
    files['proceedings.json'] = strToU8(JSON.stringify(proceedings, null, 2));

    // work-log.json — all work entries across all briefs, sorted chronologically
    const allWorkEntries = matter.briefs
        .flatMap(b =>
            b.workEntries.map(w => ({
                date: w.date,
                title: w.title,
                description: w.description,
                brief: b.name || b.briefNumber,
                briefId: b.id,
                assignedTo: w.user?.name,
                status: w.status,
                priority: w.priority,
                completedAt: w.completedAt,
                completedNote: w.completedNote,
            }))
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    files['work-log.json'] = strToU8(JSON.stringify(allWorkEntries, null, 2));

    // PLAYBOOK_PROMPT.txt
    files['PLAYBOOK_PROMPT.txt'] = strToU8(
        buildPlaybookPrompt(matter.name, matter.caseNumber, matter.briefs.length, totalDocs, totalWork)
    );

    // documents/ — fetch actual files + include OCR text
    for (const brief of matter.briefs) {
        const briefDir = sanitizePath(brief.name || brief.briefNumber || brief.id);

        for (const doc of brief.documents) {
            const docName = sanitizePath(doc.name);
            const docPath = `documents/${briefDir}/${docName}`;

            // Include extracted OCR text (directly readable by Claude)
            if (doc.ocrText) {
                files[`${docPath}.txt`] = strToU8(doc.ocrText);
            }

            // Fetch and include the actual file from Vercel Blob
            try {
                const resp = await fetch(doc.url, {
                    signal: AbortSignal.timeout(20_000),
                });
                if (resp.ok) {
                    const buffer = await resp.arrayBuffer();
                    files[docPath] = new Uint8Array(buffer);
                }
            } catch {
                // Skip unavailable files — OCR text is still included above
            }
        }
    }

    const zipped = zipSync(files, { level: 6 });

    const safeName = sanitizePath(matter.name || matter.caseNumber || matter.id);
    return new NextResponse(zipped, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${safeName}-bundle.zip"`,
            'Content-Length': zipped.length.toString(),
        },
    });
}
