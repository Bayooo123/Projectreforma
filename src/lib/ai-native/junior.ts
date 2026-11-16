import { completeJSON } from '@/lib/agents/ai-client';

/**
 * Junior is the entry point of the agent suite: every new piece of
 * information lands here first, and Junior's only job is to decide which
 * specialist it belongs to. It does not act on anything itself.
 */
export type JuniorAgent =
    | 'first_draft'
    | 'proofread'
    | 'standard_document'
    | 'deadline_watch'
    | 'ledger'
    | 'authority_search'
    | 'unclear';

const AGENTS: JuniorAgent[] = [
    'first_draft', 'proofread', 'standard_document', 'deadline_watch', 'ledger', 'authority_search',
];

const SYSTEM = `You are Junior, the entry point of a law firm's AI agent suite. Every new piece of information lands with you first. Read it and decide which ONE specialist it belongs to:

- first_draft: reporting what happened in court, or asking for a client-update letter to be drafted.
- proofread: a filing or document's text is included, asking for a structural check before it's filed.
- standard_document: asking to prepare a CTC application, enrolment of order, search application, deed of lease, deed of sublease, or tenancy agreement.
- deadline_watch: asking what the next court date or deadline is for a matter.
- ledger: reporting one or more expenses (money spent) to be recorded.
- authority_search: asking for case law or authorities for or against a fact.
- unclear: none of the above fit, or there isn't enough information to tell.

Respond with JSON only, no other text: {"agent": "<one of the above, exactly>", "reason": "<one short sentence explaining the routing>"}`;

export async function classifyIntent(input: string): Promise<{ agent: JuniorAgent; reason: string }> {
    try {
        const raw = await completeJSON({ system: SYSTEM, prompt: input, tier: 'quick', maxTokens: 150 });
        const parsed = JSON.parse(raw);
        const agent: JuniorAgent = AGENTS.includes(parsed.agent) ? parsed.agent : 'unclear';
        return { agent, reason: typeof parsed.reason === 'string' ? parsed.reason : '' };
    } catch (err) {
        console.error('[Junior] classification failed:', err);
        return { agent: 'unclear', reason: 'Could not read a routing decision from the model.' };
    }
}
