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

const MAX_DOCS        = 12;
const MAX_OCR_CHARS   = 8_000;
const MAX_PDF_VISION  = 6;
const MAX_EMAILS      = 20;
const MAX_EMAIL_CHARS = 3_000;

// ── Prompt builders ──────────────────────────────────────────────────────────

function buildTransactionalPrompt(meta: string, textBlock: string, emailBlock: string): string {
    const emailSection = emailBlock
        ? `\n\n## Email Correspondence\n${emailBlock}`
        : '';
    const hasContent = textBlock || emailBlock;
    return `You are a Legal Analyst specialising in transactional and commercial matters.
Analyse the material below and produce a brief overview.

## Brief Metadata
${meta}

## Documents
${textBlock || 'No document text available.'}${emailSection}

---

Respond in EXACTLY this format:

PROSE:
Write 2-3 concise paragraphs:
- Paragraph 1: Identify ALL named parties (client, counterparties, individuals, companies) and the nature of the matter.
- Paragraph 2: Summarise the key facts and issues deduced from documents and correspondence.
- Paragraph 3 (if emails present): Describe what the email correspondence reveals about the current position, outstanding issues, and any strategy discussed.

CHRONOLOGY:
A JSON array — one entry per significant event, in strict chronological order (earliest first).
Draw from both documents AND emails. Each email thread is a source of dated events.
Each entry must be a complete, standalone sentence naming the parties and what happened.
Format: { "date": "YYYY-MM-DD", "dateDisplay": "17 Mar 2026", "narrative": "On 17 March 2026, Catalyst Business Consult executed a Legal Retainership Agreement with Kola Abdulsalam, engaging him as legal counsel for real estate advisory services." }

Rules:
- Extract EVERY dated event, agreement, notice, payment, correspondence, and strategy discussion.
- Name the actual parties — do not say "the client" or "the parties".
- Each narrative must start with "On [dateDisplay]," followed by a complete factual sentence.
- Return [] only if the material contains absolutely zero date references.
${!hasContent ? '\nNote: No documents or emails are available — base analysis on metadata only.' : ''}`;
}

function buildLitigationPrompt(meta: string, textBlock: string, emailBlock: string): string {
    const emailSection = emailBlock
        ? `\n\n## Email Correspondence\n${emailBlock}`
        : '';
    return `You are a Legal Analyst specialising in litigation and dispute matters.
Analyse the material below and produce a brief overview.

## Brief Metadata
${meta}

## Documents
${textBlock || 'No document text available.'}${emailSection}

---

Respond in EXACTLY this format:

PROSE:
Write 3-4 concise paragraphs:
- Paragraph 1: Identify all parties (claimant, defendant, counsel, court) and the nature of the claim.
- Paragraph 2: Summarise the procedural history and key legal issues from documents and filings.
- Paragraph 3: Describe what the email correspondence reveals — strategy, counsel's positions, updates on judgments, notices, negotiations, and any intelligence about the opposing side.
- Paragraph 4: State the current status and what is next based on the most recent correspondence or filing.

CHRONOLOGY:
A JSON array in strict chronological order (earliest first).
Draw from BOTH documents AND emails. Email dates, judgment references, hearing outcomes, strategy exchanges, and notices are all valid chronology entries.
Format: { "date": "YYYY-MM-DD", "dateDisplay": "17 Mar 2026", "title": "Notice of Distraint received", "summary": "Counsel received and reviewed the Notice of Distraint from opposing party, forwarded to team for response strategy." }

Rules:
- Every email in the correspondence thread should yield at least one chronology entry if it contains a date reference or substantive event.
- Name actual parties and counsel — not "the client" or "opposing counsel".
- Return [] only if the material contains absolutely zero date references.`;
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

export interface EmailInput {
    subject: string;
    fromName: string | null;
    fromEmail: string;
    receivedAt: Date;
    body: string | null;
    bodyPreview: string | null;
}

function buildEmailBlock(emails: EmailInput[]): string {
    if (emails.length === 0) return '';
    const sorted = [...emails].sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    return sorted.slice(0, MAX_EMAILS).map(e => {
        const sender = e.fromName ? `${e.fromName} <${e.fromEmail}>` : e.fromEmail;
        const date = new Date(e.receivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const content = (e.body || e.bodyPreview || '').slice(0, MAX_EMAIL_CHARS);
        return `--- Email: ${date} | From: ${sender} | Subject: ${e.subject} ---\n${content}`;
    }).join('\n\n');
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
    emails: EmailInput[] = [],
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
    const emailBlock = buildEmailBlock(emails);

    // Build document blocks for PDFs without OCR.
    // No `title` field — not supported by the pdfs beta.
    const docBlocks: any[] = [];
    pdfResults.forEach(b64 => {
        if (b64) {
            docBlocks.push({
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: b64 },
            });
        }
    });

    const systemPrompt = 'You are a specialised Legal Analyst. Respond only in the exact format requested.';
    const promptText = briefType === 'transactional'
        ? buildTransactionalPrompt(metaLines, textBlock, emailBlock)
        : buildLitigationPrompt(metaLines, textBlock, emailBlock);

    // System prompt embedded in user turn — avoids SDK version conflicts with betas
    const userContent: any[] = [
        ...docBlocks,
        { type: 'text', text: `${systemPrompt}\n\n${promptText}` },
    ];

    // Sonnet when PDFs need vision or emails are present (richer reasoning needed)
    // Haiku only for pure text-only document briefs with no email context
    const usePdfBeta = docBlocks.length > 0;
    const usesSonnet = usePdfBeta || emails.length > 0;
    const model = usesSonnet ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

    try {
        const callParams: any = {
            model,
            max_tokens: 2048,
            messages: [{ role: 'user', content: userContent }],
        };
        if (usePdfBeta) callParams.betas = ['pdfs-2024-09-25'];

        const response = await (anthropic.messages.create as any)(callParams);
        const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
        return parseResponse(text, briefType);
    } catch (err: any) {
        const detail = err?.message ?? String(err);
        console.error('[BriefSummary] Claude call failed:', detail);
        throw new Error(`Claude API error: ${detail}`);
    }
}
