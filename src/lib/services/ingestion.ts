
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { classifyDocumentContent } from '@/lib/services/legal-heuristics';
import { isVersionOf } from '@/lib/services/ocr-versioning';

export interface IngestOptions {
    name: string;
    buffer: Buffer;
    contentType: string;
    size: number;
    briefId: string;
    folderId?: string | null;
    url: string; // The URL where the file is already stored (Blob Storage)
}

const MIME_BY_EXTENSION: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain',
};

function mimeFromName(name: string): string {
    return MIME_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
}

export class DocumentIngestionService {
    /**
     * Standardized ingestion pipeline for documents from any source (web UI, email, etc.)
     */
    static async ingest(options: IngestOptions) {
        const { name, buffer, contentType, size, briefId, folderId, url } = options;
        if (!url?.trim()) {
            throw new Error(`Refusing to file "${name}" under brief ${briefId} with no file URL — every document must have a real file behind it.`);
        }
        const documentId = nanoid();

        // 1. Create document record (Pending state)
        await prisma.document.create({
            data: {
                id: documentId,
                name,
                type: contentType.split('/')[1] || 'unknown',
                size,
                url,
                briefId,
                folderId: folderId || null,
                ocrStatus: 'pending'
            }
        });

        return this.process(documentId, { name, buffer, contentType, briefId, url });
    }

    /**
     * Runs text extraction, classification, version detection, timeline
     * extraction and embedding for a Document row that already exists.
     */
    static async process(
        documentId: string,
        { name, buffer, contentType, briefId, url }: Pick<IngestOptions, 'name' | 'buffer' | 'contentType' | 'briefId' | 'url'>
    ) {
        // 2. Perform Processing (Text extraction, classification, versioning)
        try {
            const { TextExtractor } = await import('@/lib/ingestion/text-extractor');
            const extractedText = await TextExtractor.extract(buffer, contentType);

            // 2.1 Classify Content
            const docType = classifyDocumentContent(extractedText);

            // 2.2 Version Detection
            const existingDocs = (await prisma.document.findMany({
                where: { briefId, id: { not: documentId }, ocrStatus: 'completed' },
                select: { id: true, ocrText: true, version: true }
            })) as any[];

            let versionOfId: string | null = null;
            let version = 1;

            for (const existing of existingDocs) {
                if (existing.ocrText && isVersionOf(extractedText, existing.ocrText)) {
                    versionOfId = existing.id;
                    version = existing.version + 1;
                    break;
                }
            }

            // 2.3 Update with results
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    ocrText: extractedText,
                    ocrStatus: 'completed',
                    docType: docType,
                    versionOfId: versionOfId,
                    version: version
                } as any
            });

            // 2.4 Extract Timeline Events (Fire-and-forget)
            import('@/lib/services/doc-timeline-extractor').then(({ extractDocumentTimeline }) =>
                extractDocumentTimeline(documentId, name, briefId, extractedText, url, contentType.split('/')[1] || '')
            ).catch(e => console.error('[IngestionService] Timeline extraction failed:', e));

            // 2.5 Chunk + embed for semantic search (fire-and-forget, same reasoning as 2.4)
            import('@/lib/ingestion/embed-document').then(({ embedDocument }) =>
                embedDocument(documentId, extractedText)
            ).catch(e => console.error('[IngestionService] Embedding failed:', e));

            return { success: true, documentId, docType, version };

        } catch (error) {
            console.error('[IngestionService] OCR processing failed:', error);
            await prisma.document.update({
                where: { id: documentId },
                data: { ocrStatus: 'failed' }
            });
            
            // Still attempt timeline via vision
            import('@/lib/services/doc-timeline-extractor').then(({ extractDocumentTimeline }) =>
                extractDocumentTimeline(documentId, name, briefId, null, url, contentType.split('/')[1] || '')
            ).catch(() => {});

            return { success: true, documentId, error: 'Processing failed' };
        }
    }

    /**
     * For documents whose file went straight to Blob storage from the browser
     * (the brief upload UI): download it and run the same pipeline the email
     * and WhatsApp paths get. Without this, hand-uploaded documents never get
     * OCR text, a docType, version links or embeddings.
     */
    static async processFromUrl(documentId: string) {
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: { name: true, url: true, briefId: true },
        });
        if (!doc?.url || !doc.briefId) return;

        let buffer: Buffer;
        let contentType: string;
        try {
            const res = await fetch(doc.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            buffer = Buffer.from(await res.arrayBuffer());
            contentType = res.headers.get('content-type')?.split(';')[0].trim() || mimeFromName(doc.name);
        } catch (error) {
            console.error(`[IngestionService] Could not download ${documentId} for processing:`, error);
            await prisma.document.update({ where: { id: documentId }, data: { ocrStatus: 'failed' } });
            return;
        }

        return this.process(documentId, { name: doc.name, buffer, contentType, briefId: doc.briefId, url: doc.url });
    }

    /**
     * Ensures existence of a specific folder for automated categorisation
     */
    static async getOrCreateCorrespondenceFolder(briefId: string) {
        let folder = await prisma.folder.findFirst({
            where: { briefId, name: 'Correspondence' }
        });

        if (!folder) {
            folder = await prisma.folder.create({
                data: {
                    name: 'Correspondence',
                    description: 'Automated folder for email attachments and correspondence.',
                    briefId
                }
            });
        }
        return folder;
    }
}
