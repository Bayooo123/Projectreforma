import { put } from '@vercel/blob';
import { completeJSON } from '@/lib/agents/ai-client';
import { DocumentIngestionService } from '@/lib/services/ingestion';

export interface DocumentMeta {
    title: string;
    caseTitle: string | null;
}

const SYSTEM = `A lawyer just pasted a block of text into their firm's system to keep it on file — not to ask a question or request any action. Read it and return JSON only, no other text:
{"title": "<a short, specific file name for this document, max 8 words, e.g. 'Ruling on Preliminary Objection' or 'Deed of Sublease - 14 Alausa Street'>",
 "caseTitle": "<the case name it relates to, exactly as written, e.g. 'El-Bethel v. Shoname', or null if none appears>"}`;

export async function extractDocumentMeta(text: string): Promise<DocumentMeta> {
    try {
        const raw = await completeJSON({ system: SYSTEM, prompt: text.slice(0, 6000), tier: 'quick', maxTokens: 150 });
        const parsed = JSON.parse(raw);
        return {
            title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Pasted document',
            caseTitle: typeof parsed.caseTitle === 'string' ? parsed.caseTitle : null,
        };
    } catch (err) {
        console.error('[ai-native] document meta extraction failed:', err);
        return { title: 'Pasted document', caseTitle: null };
    }
}

/**
 * Files pasted text as a real Document: a real Blob behind a real file, run
 * through the same ingestion pipeline (OCR text, docType classification,
 * timeline extraction, embedding) as any uploaded file — src/lib/services/ingestion.ts
 * refuses to create a Document with no file URL, so this is what makes a
 * paste a genuine document rather than a database row pretending to be one.
 */
export async function captureDocument(briefId: string, title: string, text: string) {
    const buffer = Buffer.from(text, 'utf-8');
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'Pasted document';
    const filename = `${safeTitle}.txt`;
    const blob = await put(filename, buffer, { access: 'public' });

    const result = await DocumentIngestionService.ingest({
        name: filename,
        buffer,
        contentType: 'text/plain',
        size: buffer.length,
        briefId,
        url: blob.url,
    });

    return { documentId: result.documentId, name: filename, docType: result.docType ?? 'Other Document' };
}
