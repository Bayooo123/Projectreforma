import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';

export type BriefType = 'litigation' | 'transactional';

export interface ChronologyRow {
    date: string;
    dateDisplay: string;
    // transactional: full narrative sentence
    narrative?: string;
    // litigation: short title + one-line summary
    title?: string;
    summary?: string;
}

export interface BriefSummaryResult {
    briefType: BriefType;
    prose: string;
    chronology: ChronologyRow[];
}

const MAX_DOCS       = 12;
const MAX_OCR_CHARS  = 8_000;
const MAX_PDF_VISION = 6;

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildTransactionalPrompt(meta: string, textBlock: string): string {
    return `You are a Legal Analyst specialising in transactional and commercial matters.
Analyse the documents below and produce a brief overview.

## Brief Metadata
${meta}

## Documents
${textBlock || 'No document text available — base analysis on metadata and document names only.'}

---

Respond in EXACTLY this format:

PROSE:
Write 2 concise paragraphs:
- Paragraph 1: Identify ALL named parties (client, counterparties, individuals, companies) and the nature of the matter (e.g. retainership, tenancy, sublease, notice).
- Paragraph 2: Describe the current status and any outstanding issues evident from the documents.

CHRONOLOGY:
A JSON array — one entry per significant event, in strict chronological order (earliest first).
Base this on dates and events found in the documents. If a document has a date, use it.
Each entry must be a complete, standalone sentence naming the parties and what happened.
Format: { "date": "YYYY-MM-DD", "dateDisplay": "17 Mar 2026", "narrative": "On 17 March 2026, Catalyst Business Consult executed a Legal Retainership Agreement with Kola Abdulsalam, engaging him as legal counsel for real estate advisory services." }

Rules:
- Extract EVERY dated event, agreement, notice, payment, and correspondence.
- Name the actual parties — do not say "the client" or "the parties".
- Each narrative must start with "On [dateDisplay]," followed by a complete factual sentence.
- Return [] only if the documents contain absolutely zero date references.`;
}

function buildLitigationPrompt(meta: string, textBlock: string): string {
    return `You are a Legal Analyst specialising in litigation and dispute matters.
Analyse the documents below and produce a brief overview.

## Brief Metadata
${meta}

## Documents
${textBlock || 'No document text available — base analysis on metadata and document names only.'}

---

Respond in EXACTLY this format:

PROSE:
Write 2-3 concise paragraphs:
- Paragraph 1: Identify all parties (claimant, defendant, counsel, court) and the nature of the claim.
- Paragraph 2: Summarise the procedural history and key legal issues.
- Paragraph 3: Describe the current status based on the most recent filing or correspondence.

CHRONOLOGY:
A JSON array in strict chronological order (earliest first). Extract every procedural date, filing, hearing, and correspondence.
Format: { "date": "YYYY-MM-DD", "dateDisplay": "17 Mar 2026", "title": "Writ of Summons filed", "summary": "Claimant filed originating summons at the High Court seeking injunctive relief." }

Return [] only if the documents contain absolutely zero date references.`;
}

// ── Document text extraction ─────────────────────────────────────────────────

async function extractDocxText(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: buf });
        return result.value?.trim() || null;
    } catch {
        return null;
    }
}

async function fetchPdfBase64(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer()).toString('base64');
    } catch {
        return null;
    }
}

function isDocx(name: string, type: string): boolean {
    return /docx?$/i.test(type) || /\.docx?(\?|$)/i.test(name);
}

function isPdf(name: string, type: string): boolean {
    return /pdf$/i.test(type) || /\.pdf(\?|$)/i.test(name);
}

// ── Response parser ──────────────────────────────────────────────────────────

function parseResponse(text: string, briefType: BriefType): BriefSummaryResult {
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

    return { briefType, prose, chronology };
}

// ── Main export ──────────────────────────────────────────────────────────────

export interface DocInput {
    name: string;
    url: string;
    type: string;
    ocrText: string | null;
}

export function detectBriefType(isLitigationDerived: boolean, category: string): BriefType {
    if (isLitigationDerived) return 'litigation';
    const cat = category.toLowerCase();
    if (/litig|court|arbitr|dispute|tribunal|criminal/.test(cat)) return 'litigation';
    return 'transactional';
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
        isLitigationDerived: boolean;
    },
    documents: DocInput[],
): Promise<BriefSummaryResult | null> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) { console.error('[BriefSummary] ANTHROPIC_API_KEY not set'); return null; }

    const anthropic = new Anthropic({ apiKey });
    const briefType = detectBriefType(briefMeta.isLitigationDerived, briefMeta.category);

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

    // Separate docs by what we already have vs what we need to fetch
    const docsWithOcr  = documents.filter(d => d.ocrText && d.ocrText.trim().length > 30).slice(0, MAX_DOCS);
    const docsWithoutOcr = documents.filter(d => !d.ocrText || d.ocrText.trim().length <= 30);

    const pdfDocsToFetch  = docsWithoutOcr.filter(d => isPdf(d.name, d.type)).slice(0, MAX_PDF_VISION);
    const docxDocsToFetch = docsWithoutOcr.filter(d => isDocx(d.name, d.type)).slice(0, MAX_DOCS);

    // Fetch everything in parallel
    const [pdfResults, docxTexts] = await Promise.all([
        Promise.all(pdfDocsToFetch.map(d => fetchPdfBase64(d.url))),
        Promise.all(docxDocsToFetch.map(d => extractDocxText(d.url))),
    ]);

    // Build text block from OCR + mammoth-extracted .docx text
    const textParts: string[] = [];
    docsWithOcr.forEach((d, i) =>
        textParts.push(`--- Document ${i + 1}: ${d.name} ---\n${d.ocrText!.slice(0, MAX_OCR_CHARS)}`)
    );
    docxTexts.forEach((text, i) => {
        if (text) textParts.push(`--- Document: ${docxDocsToFetch[i].name} ---\n${text.slice(0, MAX_OCR_CHARS)}`);
    });
    const textBlock = textParts.join('\n\n');

    // Build document blocks for PDFs without OCR
    const docBlocks: Anthropic.MessageParam['content'] = [];
    pdfResults.forEach((b64, i) => {
        if (b64) {
            docBlocks.push({
                type: 'document' as const,
                source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: b64 },
                title: pdfDocsToFetch[i].name,
            } as any);
        }
    });

    const promptText = briefType === 'transactional'
        ? buildTransactionalPrompt(metaLines, textBlock)
        : buildLitigationPrompt(metaLines, textBlock);

    const content: Anthropic.MessageParam['content'] = [
        ...docBlocks,
        { type: 'text', text: promptText },
    ];

    // Use Sonnet when reading PDFs via vision; Haiku for text-only (faster)
    const model = docBlocks.length > 0 ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

    try {
        const response = await (anthropic.messages.create as any)({
            model,
            max_tokens: 2048,
            betas: docBlocks.length > 0 ? ['pdfs-2024-09-25'] : undefined,
            system: 'You are a specialised Legal Analyst. Respond only in the exact format requested.',
            messages: [{ role: 'user', content }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
        return parseResponse(text, briefType);
    } catch (err) {
        console.error('[BriefSummary] Claude call failed:', err);
        return null;
    }
}
