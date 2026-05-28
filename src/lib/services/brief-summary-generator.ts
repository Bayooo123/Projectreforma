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

const CHAR_LIMIT_PER_DOC = 8000;
const MAX_DOCS = 12;

function buildPrompt(briefMeta: string, documentTexts: string): string {
    return `You are a Legal and Project Management Analyst AI. Analyse the documents below and produce a structured brief overview.

## Brief Metadata
${briefMeta}

## Document Contents
${documentTexts}

---

Respond in EXACTLY this format — no preamble, no deviation:

PROSE:
Write 2-3 professional paragraphs:
- Paragraph 1: Identify all named parties (client, opposing counsel, third parties, institutions) and the primary subject of the matter.
- Paragraph 2: Summarise the key sequence of events, disputes, or contractual milestones evident from the documents.
- Paragraph 3: Describe the current status of the matter based on the most recent correspondence or filing.

CHRONOLOGY:
A JSON array in strict chronological order (earliest first). Extract EVERY date reference — document dates, referenced dates, scheduled dates, signature dates. Each element:
{ "date": "<YYYY-MM-DD, or 'Late YYYY' if only year known>", "dateDisplay": "<human-friendly e.g. '21 Aug 2025'>", "title": "<event or document title, max 8 words>", "summary": "<one sentence — the key action or decision on this date>" }

Return [] only if the documents contain absolutely no date references.`;
}

function parseResponse(text: string): BriefSummaryResult {
    const proseMatch = text.match(/PROSE:\s*([\s\S]*?)(?=\n\s*CHRONOLOGY:|$)/i);
    const prose = proseMatch ? proseMatch[1].trim() : text.trim();

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
}

export async function generateBriefSummaryFromDocuments(
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
    documents: Array<{ name: string; ocrText: string | null }>,
): Promise<BriefSummaryResult | null> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) { console.error('[BriefSummary] ANTHROPIC_API_KEY not set'); return null; }

    const anthropic = new Anthropic({ apiKey });

    const metaLines = [
        `Brief name: ${briefMeta.name}`,
        briefMeta.client      ? `Client: ${briefMeta.client}`           : null,
        briefMeta.lawyer      ? `Assigned counsel: ${briefMeta.lawyer}` : null,
        `Category: ${briefMeta.category}`,
        `Status: ${briefMeta.status}`,
        briefMeta.matter      ? `Related matter: ${briefMeta.matter}`   : null,
        briefMeta.dueDate     ? `Due date: ${briefMeta.dueDate}`        : null,
        briefMeta.description ? `Description: ${briefMeta.description}` : null,
    ].filter(Boolean).join('\n');

    // Build document text block — cap per-doc and total doc count to stay fast
    const usable = documents
        .filter(d => d.ocrText && d.ocrText.trim().length > 20)
        .slice(0, MAX_DOCS);

    const documentTexts = usable.length === 0
        ? 'No document text available. Base the analysis on the brief metadata only.'
        : usable
            .map((d, i) =>
                `--- Document ${i + 1}: ${d.name} ---\n${d.ocrText!.slice(0, CHAR_LIMIT_PER_DOC)}`
            )
            .join('\n\n');

    try {
        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            system: 'You are a specialised Legal Analyst. Respond only in the exact format requested.',
            messages: [{ role: 'user', content: buildPrompt(metaLines, documentTexts) }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
        return parseResponse(text);
    } catch (err) {
        console.error('[BriefSummary] Claude call failed:', err);
        return null;
    }
}
