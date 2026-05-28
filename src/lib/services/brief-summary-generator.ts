import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';

export interface ChronologyRow {
    date: string;
    dateDisplay: string;
    title: string;
    summary: string;
}

export interface BriefSummaryResult {
    prose: string;
    chronology: ChronologyRow[];
}

function buildPrompt(briefMeta: string, events: string): string {
    return `You are a Legal and Project Management Analyst AI. Based on the information below about a legal brief, provide a structured analysis.

## Brief Metadata
${briefMeta}

## Extracted Document Events (chronological)
${events}

---

Respond in exactly this format — no deviation:

PROSE:
Write 2-3 professional paragraphs:
- Paragraph 1: Identify the core parties (client, assigned counsel, any third parties named in the events) and the primary subject of the matter.
- Paragraph 2: Summarise the key progression of events and any disputes or milestones evident from the documents.
- Paragraph 3: Describe the current status based on the most recent events. Use a neutral, professional tone throughout.

CHRONOLOGY:
A JSON array in strict chronological order (earliest first). Each element:
{ "date": "<YYYY-MM-DD, or 'Late YYYY' if approximate>", "dateDisplay": "<human-friendly e.g. '21 Aug 2025'>", "title": "<event or document title>", "summary": "<one sentence — the key action or decision>" }

Return [] for the chronology array only if there are truly no events to list.`;
}

export async function generateBriefSummaryFromEvents(
    briefMeta: {
        name: string;
        client: string | null;
        lawyer: string | null;
        category: string;
        status: string;
        dueDate: string | null;
        description: string | null;
        matter: string | null;
    },
    events: Array<{
        eventDate: Date | null;
        eventDateRaw: string;
        description: string;
        documentName: string;
    }>,
): Promise<BriefSummaryResult | null> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) { console.error('[BriefSummary] ANTHROPIC_API_KEY not set'); return null; }

    const client = new Anthropic({ apiKey });

    const metaLines = [
        `Name: ${briefMeta.name}`,
        briefMeta.client        ? `Client: ${briefMeta.client}`               : null,
        briefMeta.lawyer        ? `Assigned Counsel: ${briefMeta.lawyer}`      : null,
        `Category: ${briefMeta.category}`,
        `Status: ${briefMeta.status}`,
        briefMeta.matter        ? `Related Matter: ${briefMeta.matter}`        : null,
        briefMeta.dueDate       ? `Due Date: ${briefMeta.dueDate}`             : null,
        briefMeta.description   ? `Description: ${briefMeta.description}`      : null,
    ].filter(Boolean).join('\n');

    const eventsStr = events.length === 0
        ? 'No events have been extracted from documents yet.'
        : events
            .slice()
            .sort((a, b) => (a.eventDate?.getTime() ?? 0) - (b.eventDate?.getTime() ?? 0))
            .map(e => `[${e.eventDate ? e.eventDate.toISOString().slice(0, 10) : e.eventDateRaw}] (source: "${e.documentName}") ${e.description}`)
            .join('\n');

    try {
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: 'You are a specialised Legal and Project Management Analyst. Respond only in the requested format.',
            messages: [{ role: 'user', content: buildPrompt(metaLines, eventsStr) }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';

        const proseMatch = text.match(/PROSE:\s*([\s\S]*?)(?=\n\s*CHRONOLOGY:|$)/i);
        const prose = proseMatch ? proseMatch[1].trim() : text;

        const chronoMatch = text.match(/CHRONOLOGY:\s*([\s\S]*)/i);
        let chronology: ChronologyRow[] = [];
        if (chronoMatch) {
            const raw = chronoMatch[1].trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) chronology = parsed;
            } catch {
                console.error('[BriefSummary] Failed to parse chronology JSON');
            }
        }

        return { prose, chronology };
    } catch (err) {
        console.error('[BriefSummary] Claude call failed:', err);
        return null;
    }
}
