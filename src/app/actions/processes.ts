'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { generateBriefNumber } from '@/lib/briefs';
import { DocumentIngestionService } from '@/lib/services/ingestion';

async function getSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorised');
    return session;
}

export interface NewProcessFileInput {
    fileName: string;
    blobUrl: string;
    contentType: string;
    size: number;
}

export interface ProcessDocumentResult {
    documentId: string;
    fileName: string;
    docType: string;
    isAffidavit: boolean;
}

// Separate from DocumentIngestionService.getOrCreateCorrespondenceFolder,
// which is specifically for email/WhatsApp attachments — a filed process
// bundle isn't correspondence, so it gets its own folder rather than being
// mixed into that one.
async function getOrCreateProcessFolder(briefId: string) {
    let folder = await prisma.folder.findFirst({ where: { briefId, name: 'Process Filing' } });
    if (!folder) {
        folder = await prisma.folder.create({
            data: {
                name: 'Process Filing',
                description: 'Documents filed as part of a court process bundle.',
                briefId,
            },
        });
    }
    return folder;
}

// Creates the Brief that represents a "New Process" filing bundle against an
// existing (or just-created) Matter, then runs every uploaded document
// through the same OCR/classification pipeline every other document in
// Reforma already goes through — no new recognition logic needed, this is
// the exact function email and WhatsApp attachments are ingested with.
// Affidavit-classified documents are flagged for the Oathlify hand-off,
// which is a separate, not-yet-built step — see the layout doc.
export async function createProcess(input: {
    matterId: string;
    files: NewProcessFileInput[];
}) {
    const session = await getSession();
    const workspaceId = session.user.workspaceId;
    const userId = session.user.id;

    if (!input.files.length) {
        return { success: false as const, error: 'Upload at least one document before proceeding.' };
    }

    const matter = await prisma.matter.findFirst({
        where: { id: input.matterId, workspaceId, deletedAt: null },
        select: { id: true, name: true, clientId: true },
    });
    if (!matter) return { success: false as const, error: 'Suit not found in this workspace' };
    if (!matter.clientId) {
        return { success: false as const, error: 'This suit has no client on record — add one before filing a process.' };
    }

    const briefNumber = await generateBriefNumber(workspaceId);
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const brief = await prisma.brief.create({
        data: {
            briefNumber,
            name: `New Process — ${matter.name} — ${today}`,
            clientId: matter.clientId,
            matterId: matter.id,
            lawyerId: userId,
            lawyerInChargeId: userId,
            workspaceId,
            category: 'Litigation',
            status: 'active',
        },
    });

    const folder = await getOrCreateProcessFolder(brief.id);

    const results: ProcessDocumentResult[] = [];
    for (const file of input.files) {
        try {
            const res = await fetch(file.blobUrl);
            if (!res.ok) throw new Error(`Could not fetch uploaded file (${res.status})`);
            const buffer = Buffer.from(await res.arrayBuffer());

            const ingested = await DocumentIngestionService.ingest({
                name: file.fileName,
                buffer,
                contentType: file.contentType,
                size: file.size,
                briefId: brief.id,
                folderId: folder.id,
                url: file.blobUrl,
            });

            // ingest() returns a different shape on OCR failure (no docType,
            // an `error` field instead) — narrow with `in` rather than
            // assuming docType is always present.
            const docType = 'docType' in ingested && ingested.docType ? ingested.docType : 'Unclassified';

            results.push({
                documentId: ingested.documentId,
                fileName: file.fileName,
                docType,
                isAffidavit: docType === 'Affidavit',
            });
        } catch (error) {
            console.error('[createProcess] Failed to ingest', file.fileName, error);
            results.push({
                documentId: '',
                fileName: file.fileName,
                docType: 'Failed to process',
                isAffidavit: false,
            });
        }
    }

    revalidatePath('/briefs');
    revalidatePath('/calendar');

    return {
        success: true as const,
        briefId: brief.id,
        briefNumber: brief.briefNumber,
        matterId: matter.id,
        matterName: matter.name,
        documents: results,
        affidavitCount: results.filter(r => r.isAffidavit).length,
    };
}
