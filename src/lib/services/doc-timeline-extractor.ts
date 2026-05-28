import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';

async function fetchOcrText(documentId: string): Promise<string | null> {
    const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { ocrText: true },
    });
    return doc?.ocrText ?? null;
}

const EXTRACTION_PROMPT = (documentName: string) =>
    `You are a legal document analyst reviewing "${documentName}".

Extract EVERY date reference in this document — typed, handwritten, stamped, or printed.

Return ONLY a valid JSON array, no explanation, no markdown fences.
Each element: { "dateRaw": "<exact text from document>", "date": "<YYYY-MM-DD or null only if year is truly unknown>", "description": "<one sentence: what happened or was stated on this date>" }

Date parsing rules — be aggressive:
- "8 May 2026" → "2026-05-08"
- "8th day of May, 2026" → "2026-05-08"
- "23 April 2026" → "2026-04-23"
- "23/04/2026" or "23/4/26" or "31/5/26" → parse accordingly
- "May 2026" (no day) → "2026-05-01"
- "2026" (year only) → "2026-01-01"
- Handwritten stamps like "31/5/26" → "2026-05-31"
- Only set date to null if no year can be determined at all.

Include:
- The letter/document date (top of page)
- All dates mentioned in the body ("dated 23 April 2026", "within 7 days of receipt")
- Signature dates, stamp dates, acknowledgement dates
- Referenced past or future dates

Return [] only if the document contains zero date references.`;

export async function extractDocumentTimeline(
    documentId: string,
    documentName: string,
    briefId: string,
    ocrText: string | null,
    documentUrl?: string,
    documentType?: string,
): Promise<number> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) { console.error('[Timeline] ANTHROPIC_API_KEY not set'); return 0; }

    const client = new Anthropic({ apiKey });

    // Prefer direct vision/document reading — more accurate than OCR text
    if (documentUrl) {
        const visionResult = await extractWithVision(client, documentId, documentName, briefId, documentUrl, documentType ?? '');
        if (visionResult >= 0) return visionResult;
    }

    // Fall back to OCR text — fetch lazily only when vision is unavailable (non-PDF/image formats)
    const resolvedOcr = ocrText ?? await fetchOcrText(documentId);
    if (resolvedOcr && resolvedOcr.trim().length >= 20) {
        return await extractWithText(client, documentId, documentName, briefId, resolvedOcr);
    }

    console.log(`[Timeline] No content available for: ${documentName}`);
    return 0;
}

async function extractWithVision(
    client: Anthropic,
    documentId: string,
    documentName: string,
    briefId: string,
    url: string,
    type: string,
): Promise<number> {
    const isPdf = /pdf/i.test(type) || /\.pdf(\?|$)/i.test(url);
    const isImage = /^(png|jpg|jpeg|gif|webp)$/i.test(type) || /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(url);

    if (!isPdf && !isImage) return -1; // not a visual document — fall through to text

    let base64: string;
    try {
        const res = await fetch(url);
        if (!res.ok) { console.error(`[Timeline] Failed to fetch ${url}: ${res.status}`); return -1; }
        const buf = await res.arrayBuffer();
        base64 = Buffer.from(buf).toString('base64');
    } catch (e) {
        console.error('[Timeline] Fetch error for:', documentName, e);
        return -1;
    }

    let content: Anthropic.MessageParam['content'];

    if (isPdf) {
        content = [
            {
                type: 'document' as const,
                source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 },
            } as any, // SDK type for document blocks
            { type: 'text' as const, text: EXTRACTION_PROMPT(documentName) },
        ];
    } else {
        const mediaType = (type.toLowerCase() === 'jpg' ? 'image/jpeg' : `image/${type.toLowerCase()}`) as
            'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        content = [
            {
                type: 'image' as const,
                source: { type: 'base64' as const, media_type: mediaType, data: base64 },
            },
            { type: 'text' as const, text: EXTRACTION_PROMPT(documentName) },
        ];
    }

    return await callClaudeAndSave(client, documentId, documentName, briefId, content, 'vision');
}

async function extractWithText(
    client: Anthropic,
    documentId: string,
    documentName: string,
    briefId: string,
    ocrText: string,
): Promise<number> {
    const content: Anthropic.MessageParam['content'] = [
        {
            type: 'text' as const,
            text: EXTRACTION_PROMPT(documentName) + `\n\nDocument content:\n${ocrText.substring(0, 12000)}`,
        },
    ];
    return await callClaudeAndSave(client, documentId, documentName, briefId, content, 'text');
}

async function callClaudeAndSave(
    client: Anthropic,
    documentId: string,
    documentName: string,
    briefId: string,
    content: Anthropic.MessageParam['content'],
    method: string,
): Promise<number> {
    let events: Array<{ dateRaw: string; date: string | null; description: string }> = [];

    try {
        const response = await (client.messages.create as any)({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            betas: ['pdfs-2024-09-25'],
            messages: [{ role: 'user', content }],
        });

        const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '[]';
        const cleaned = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
        events = JSON.parse(cleaned);
        if (!Array.isArray(events)) events = [];
        console.log(`[Timeline] ${method} → ${documentName}: ${events.length} events`);
    } catch (err) {
        console.error(`[Timeline] ${method} extraction failed for:`, documentName, err);
        return 0;
    }

    const valid = events.filter(e => e.dateRaw && e.description);
    if (valid.length === 0) return 0;

    await prisma.documentTimelineEvent.deleteMany({ where: { documentId } });

    await prisma.documentTimelineEvent.createMany({
        data: valid.map(e => ({
            briefId,
            documentId,
            documentName,
            eventDateRaw: e.dateRaw,
            eventDate: e.date
                ? (() => { try { const d = new Date(e.date!); return isNaN(d.getTime()) ? null : d; } catch { return null; } })()
                : null,
            description: e.description,
        })),
    });

    return valid.length;
}
