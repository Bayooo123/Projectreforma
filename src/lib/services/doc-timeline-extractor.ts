import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';

interface ExtractedEvent {
    dateRaw: string;
    date: string | null;
    description: string;
}

export async function extractDocumentTimeline(
    documentId: string,
    documentName: string,
    briefId: string,
    ocrText: string,
): Promise<number> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) { console.error('[Timeline] ANTHROPIC_API_KEY not set'); return 0; }
    if (!ocrText || ocrText.trim().length < 50) { console.log('[Timeline] Skipping — OCR text too short for:', documentName); return 0; }

    const client = new Anthropic({ apiKey });

    const prompt = `You are a legal document analyst. Extract every specific date and event from the following legal document.

Return ONLY a valid JSON array — no explanation, no markdown, no code fences.
Each element: { "dateRaw": "<exact date text from document>", "date": "<ISO-8601 YYYY-MM-DD or null ONLY if truly impossible to determine any year>", "description": "<concise one-sentence description of what happened on this date>" }

Rules:
- Include every event that has an explicit date mentioned anywhere in the document.
- Be aggressive about parsing dates: "14th day of March, 2023" → "2023-03-14", "14/03/2023" → "2023-03-14", "March 14 2023" → "2023-03-14", "14 March 2023" → "2023-03-14".
- If only year and month are given (e.g. "March 2023"), use the 1st: "2023-03-01".
- If only a year is given (e.g. "in 2022"), use "2022-01-01".
- Set "date" to null ONLY if there is genuinely no way to determine even the year.
- Do not include dates that are purely administrative (e.g. page numbers, form reference numbers).
- Include: dates of letters, agreements, court orders, hearings, events described in the document, effective dates, expiry dates, signature dates.
- If no datable events exist, return [].

Document name: ${documentName}

Document content:
${ocrText.substring(0, 10000)}`;

    let events: ExtractedEvent[] = [];

    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
        });

        const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '[]';
        const cleaned = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
        events = JSON.parse(cleaned);
        if (!Array.isArray(events)) events = [];
        console.log(`[Timeline] ${documentName}: Claude returned ${events.length} events`);
    } catch (err) {
        console.error('[Timeline] Claude call or JSON parse failed for:', documentName, err);
        return 0;
    }

    const valid = events.filter(e => e.dateRaw && e.description);
    if (valid.length === 0) return 0;

    // Replace previous extraction for this document
    await prisma.documentTimelineEvent.deleteMany({ where: { documentId } });

    await prisma.documentTimelineEvent.createMany({
        data: valid.map(e => ({
            briefId,
            documentId,
            documentName,
            eventDateRaw: e.dateRaw,
            eventDate: e.date ? (() => { try { const d = new Date(e.date!); return isNaN(d.getTime()) ? null : d; } catch { return null; } })() : null,
            description: e.description,
        })),
    });

    console.log(`[Timeline] Saved ${valid.length} events for: ${documentName}`);
    return valid.length;
}
