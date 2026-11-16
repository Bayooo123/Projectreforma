import { completeJSON } from '@/lib/agents/ai-client';

export interface ExtractedCaseFacts {
    caseTitle: string | null;
    court: string | null;
    judge: string | null;
    claimantName: string | null;
    proceedings: string;
    adjournedTo: string | null;
}

const SYSTEM = `Extract structured facts from a lawyer's report of a court proceeding. Return JSON only, no other text:
{"caseTitle": "<the case name exactly as written, e.g. 'El-Bethel v. Shoname', or null if not stated>",
 "court": "<the court, or null>",
 "judge": "<the judge, or null>",
 "claimantName": "<the name of the party the lawyer represents, inferred from the 'Appearances' line and which side it names, or null if unclear>",
 "proceedings": "<a one-paragraph plain summary of what happened in the proceeding>",
 "adjournedTo": "<ISO date YYYY-MM-DD if a next hearing date is mentioned, else null>"}`;

export async function extractCaseFacts(input: string): Promise<ExtractedCaseFacts> {
    try {
        const raw = await completeJSON({ system: SYSTEM, prompt: input, tier: 'quick', maxTokens: 400 });
        const parsed = JSON.parse(raw);
        return {
            caseTitle: typeof parsed.caseTitle === 'string' ? parsed.caseTitle : null,
            court: typeof parsed.court === 'string' ? parsed.court : null,
            judge: typeof parsed.judge === 'string' ? parsed.judge : null,
            claimantName: typeof parsed.claimantName === 'string' ? parsed.claimantName : null,
            proceedings: typeof parsed.proceedings === 'string' ? parsed.proceedings : input,
            adjournedTo: typeof parsed.adjournedTo === 'string' ? parsed.adjournedTo : null,
        };
    } catch (err) {
        console.error('[ai-native] case fact extraction failed:', err);
        return { caseTitle: null, court: null, judge: null, claimantName: null, proceedings: input, adjournedTo: null };
    }
}
