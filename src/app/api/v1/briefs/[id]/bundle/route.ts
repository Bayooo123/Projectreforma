import { NextRequest, NextResponse } from 'next/server';
import { zipSync, strToU8 } from 'fflate';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function sanitizePath(name: string): string {
    return name.replace(/[^\w.\-]/g, '_').substring(0, 80);
}

function buildPlaybookPrompt(briefName: string, briefNumber: string, category: string, docCount: number, workEntryCount: number): string {
    return `# Playbook Generation Prompt — ${briefName} (${briefNumber})

You are analyzing a complete brief bundle for "${briefName}", a ${category} matter.

## Bundle Contents
- manifest.json    — Brief overview: client, responsible lawyer, category, status, due date
- work-log.json    — All work entries from start to finish (${workEntryCount} entries), sorted chronologically
- documents/       — All documents organized by folder (${docCount} files)
  - Each document may have a matching .txt file with extracted text for direct reading

## Your Task: Generate a DOCUMENTARY PREPARATION PLAYBOOK

Analyze all files in this bundle and produce a structured playbook capturing how this type of
matter is prepared from start to final deliverable. The playbook becomes a reusable template
for all future matters of this type.

### Playbook Sections Required

1. **MATTER TYPE & DELIVERABLE**
   - What category of legal work is this? (advisory, transactional, opinion, drafting, etc.)
   - What is the final document or deliverable the client receives?
   - What legal domain applies?

2. **DOCUMENT LIFECYCLE**
   - What documents are created, reviewed, and revised across the life of this matter?
   - Which are internal drafts vs. client-facing vs. filed/registered?
   - What is the natural sequence of documents (what depends on what)?

3. **PHASE BREAKDOWN**
   - Break the matter into named phases based on the work-log dates and descriptions
   - For each phase: what work is done, what documents are produced, what decisions are made
   - Use actual dates from work-log.json to anchor your phase boundaries

4. **DECISION POINTS & RESEARCH GATES**
   - Where must a lawyer pause to research, advise, or get client instructions before proceeding?
   - What information must be gathered before each phase can begin?
   - What risk factors or flags should trigger escalation?

5. **TIME ESTIMATES**
   - Based on work-log.json, how long does each phase take?
   - What is the typical total turnaround for this matter type?
   - Which steps are most time-intensive?

6. **STANDARD CHECKLIST**
   - A reusable checkbox checklist a lawyer can follow from day one
   - Group checks by phase

7. **DOCUMENT TEMPLATES TO CREATE**
   - Based on the documents in this bundle, what templates should the firm standardize?
   - List each template, its purpose, and when it is used

8. **BEST PRACTICES**
   - What patterns from this matter should be replicated in future similar work?
   - What would improve the process if done again?

Output the playbook in structured Markdown suitable for saving as a firm knowledge document.
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

    const brief = await prisma.brief.findFirst({
        where: { id, workspaceId },
        include: {
            client: { select: { id: true, name: true, email: true } },
            lawyer: { select: { id: true, name: true, email: true } },
            lawyerInCharge: { select: { id: true, name: true, email: true } },
            matter: { select: { id: true, name: true, caseNumber: true } },
            folders: {
                orderBy: { name: 'asc' },
            },
            documents: {
                orderBy: [{ version: 'desc' }, { uploadedAt: 'desc' }],
            },
            workEntries: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { date: 'asc' },
            },
        },
    });

    if (!brief) {
        return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    // Fetch email attachments linked to this brief via PulseEvent → InboundEmail
    const existingDocUrls = new Set(brief.documents.map(d => d.url));
    const pulseEvents = await prisma.pulseEvent.findMany({
        where: { briefId: id, inboundEmailId: { not: null } },
        select: {
            inboundEmail: {
                select: {
                    subject: true,
                    fromName: true,
                    receivedAt: true,
                    attachments: {
                        select: { id: true, name: true, url: true, contentType: true, size: true, uploadedAt: true },
                    },
                },
            },
        },
    });

    const seenAttachmentIds = new Set<string>();
    const emailAttachments: Array<{ id: string; name: string; url: string; subject: string | null; senderName: string | null }> = [];
    for (const pe of pulseEvents) {
        if (!pe.inboundEmail) continue;
        for (const att of pe.inboundEmail.attachments) {
            if (seenAttachmentIds.has(att.id) || existingDocUrls.has(att.url)) continue;
            seenAttachmentIds.add(att.id);
            emailAttachments.push({ id: att.id, name: att.name, url: att.url, subject: pe.inboundEmail.subject, senderName: pe.inboundEmail.fromName });
        }
    }

    const files: Record<string, Uint8Array> = {};

    // manifest.json
    const manifest = {
        generatedAt: new Date().toISOString(),
        brief: {
            id: brief.id,
            briefNumber: brief.briefNumber,
            customBriefNumber: brief.customBriefNumber,
            name: brief.name,
            customTitle: brief.customTitle,
            category: brief.category,
            status: brief.status,
            description: brief.description,
            dueDate: brief.dueDate,
            createdAt: brief.createdAt,
            client: brief.client,
            lawyer: brief.lawyer,
            lawyerInCharge: brief.lawyerInCharge,
            matter: brief.matter,
        },
        summary: {
            totalDocuments: brief.documents.length,
            totalEmailAttachments: emailAttachments.length,
            totalFolders: brief.folders.length,
            totalWorkEntries: brief.workEntries.length,
        },
    };
    files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));

    // work-log.json — chronological work entries
    const workLog = brief.workEntries.map(w => ({
        date: w.date,
        title: w.title,
        description: w.description,
        assignedTo: w.user?.name,
        status: w.status,
        priority: w.priority,
        completedAt: w.completedAt,
        completedNote: w.completedNote,
    }));
    files['work-log.json'] = strToU8(JSON.stringify(workLog, null, 2));

    // PLAYBOOK_PROMPT.txt
    const displayName = brief.customTitle || brief.name;
    const displayNumber = brief.customBriefNumber || brief.briefNumber;
    files['PLAYBOOK_PROMPT.txt'] = strToU8(
        buildPlaybookPrompt(displayName, displayNumber, brief.category, brief.documents.length + emailAttachments.length, brief.workEntries.length)
    );

    // Build folder name lookup
    const folderNames: Record<string, string> = {};
    for (const folder of brief.folders) {
        folderNames[folder.id] = sanitizePath(folder.name);
    }

    // documents/ — organized by folder, with OCR text alongside each file
    for (const doc of brief.documents) {
        const dir = doc.folderId && folderNames[doc.folderId]
            ? `documents/${folderNames[doc.folderId]}`
            : 'documents';
        const docName = sanitizePath(doc.name);
        const docPath = `${dir}/${docName}`;

        if (doc.ocrText) {
            files[`${docPath}.txt`] = strToU8(doc.ocrText);
        }

        try {
            const resp = await fetch(doc.url, { signal: AbortSignal.timeout(20_000) });
            if (resp.ok) {
                const buffer = await resp.arrayBuffer();
                files[docPath] = new Uint8Array(buffer);
            }
        } catch {
            // Skip unavailable files; OCR text is still included above
        }
    }

    // email-attachments/ — files received via email that haven't been formally ingested as documents
    for (const att of emailAttachments) {
        const attPath = `email-attachments/${sanitizePath(att.name)}`;
        try {
            const resp = await fetch(att.url, { signal: AbortSignal.timeout(20_000) });
            if (resp.ok) {
                const buffer = await resp.arrayBuffer();
                files[attPath] = new Uint8Array(buffer);
            }
        } catch {
            // Skip unavailable attachments
        }
    }

    const zipped = zipSync(files, { level: 6 });

    const safeName = sanitizePath(displayName || displayNumber || brief.id);
    return new NextResponse(zipped, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${safeName}-bundle.zip"`,
            'Content-Length': zipped.length.toString(),
        },
    });
}
