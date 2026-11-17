import { completeText } from '@/lib/agents/ai-client';
import { SYSTEM_PROMPTS } from '@/lib/drafting/prompts';

/**
 * Proofreads one filing document's extracted text for British-English
 * usage, grammar, and structural defects (orphaned numbered paragraphs,
 * unfilled placeholders) — the benchmark described for the filing
 * checklist's structural/grammar check. Returns the model's plain-text
 * findings; callers render it as-is rather than parsing it into a
 * structured shape, same pattern DraftingService uses for drafts.
 */
export async function reviewFilingDocument(text: string, docType: string): Promise<string> {
    let prompt = SYSTEM_PROMPTS.FILING_STRUCTURAL_REVIEW;
    prompt = prompt.replace('{{DOC_TYPE}}', docType || 'Unclassified');
    prompt = prompt.replace('{{TEXT}}', text);

    const result = await completeText({
        system: 'You are a meticulous legal document proofreader.',
        prompt,
        tier: 'complex',
        maxTokens: 1024,
    });

    return result.trim() || 'No issues found.';
}
