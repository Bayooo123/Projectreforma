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
): Promise<void> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) return;
    if (!ocrText || ocrText.trim().length < 50) return;

    const client = new Anthropic({ apiKey });

    const prompt = `You are a legal document analyst. Extract every specific date and event from the following legal document.

Return ONLY a valid JSON array — no explanation, no markdown, no code fences.
Each element: { "dateRaw": "<exact date text from document>", "date": "<ISO-8601 YYYY-MM-DD or null if unparseable>", "description": "<concise one-sentence description of what happened>" }

Rules:
- Only include events with an explicit date mentioned in the document.
- Do not infer, guess, or extrapolate dates.
- Do not include dates that are purely administrative (e.g. "page 1 of 3").
- If no datable events exist, return [].
- Dates may be relative ("3rd day of March 2023") — convert to ISO if possible.

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
        // Strip any accidental markdown fences
        const cleaned = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
        events = JSON.parse(cleaned);
        if (!Array.isArray(events)) events = [];
    } catch {
        return;
    }

    if (events.length === 0) return;

    // Replace previous extraction for this document
    await prisma.documentTimelineEvent.deleteMany({ where: { documentId } });

    await prisma.documentTimelineEvent.createMany({
        data: events
            .filter(e => e.dateRaw && e.description)
            .map(e => ({
                briefId,
                documentId,
                documentName,
                eventDateRaw: e.dateRaw,
                eventDate: e.date ? (() => { try { return new Date(e.date!); } catch { return null; } })() : null,
                description: e.description,
            })),
    });
}
