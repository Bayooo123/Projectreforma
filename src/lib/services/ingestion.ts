
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

export class DocumentIngestionService {
    /**
     * Standardized ingestion pipeline for documents from any source (web UI, email, etc.)
     */
    static async ingest(options: IngestOptions) {
        const { name, buffer, contentType, size, briefId, folderId, url } = options;
        const documentId = nanoid();

        // 1. Create document record (Pending state)
        const document = await prisma.document.create({
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
