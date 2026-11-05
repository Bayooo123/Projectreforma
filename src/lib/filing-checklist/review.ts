import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPTS } from '@/lib/drafting/prompts';
import { config } from '@/lib/config';

/**
 * Proofreads one filing document's extracted text for British-English
 * usage, grammar, and structural defects (orphaned numbered paragraphs,
 * unfilled placeholders) — the benchmark described for the filing
 * checklist's structural/grammar check. Returns Claude's plain-text
 * findings; callers render it as-is rather than parsing it into a
 * structured shape, same pattern DraftingService uses for drafts.
 */
export async function reviewFilingDocument(text: string, docType: string): Promise<string> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.');

    let prompt = SYSTEM_PROMPTS.FILING_STRUCTURAL_REVIEW;
    prompt = prompt.replace('{{DOC_TYPE}}', docType || 'Unclassified');
    prompt = prompt.replace('{{TEXT}}', text);

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
    });

    const result = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return result || 'No issues found.';
}
