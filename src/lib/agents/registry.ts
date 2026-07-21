import type Anthropic from '@anthropic-ai/sdk';
import { BRIEF_MANAGER_TOOLS, executeBriefManagerTool } from './brief-manager/tools';

export interface AgentInsightLike {
    title: string;
    summary: string;
    data: Record<string, unknown>;
    briefId: string | null;
}

export interface AgentDefinition {
    tools: Anthropic.Tool[];
    executeTool: (name: string, input: Record<string, unknown>, ctx: { insightId: string; briefId: string; insightData: Record<string, unknown> }) => Promise<unknown>;
    systemPrompt: (insight: AgentInsightLike) => string;
}

// One entry per agent type. Only 'brief_manager' is implemented today — adding
// the other Firm Pulse agents (meetings, office_manager, client_manager,
// compliance, analytics) later means adding a new key here plus a new
// scan+tools module, not touching the chat route below.
export const AGENT_REGISTRY: Record<string, AgentDefinition> = {
    brief_manager: {
        tools: BRIEF_MANAGER_TOOLS,
        // Each agent's executeTool works with its own insight data shape (here
        // BriefManagerInsightData) — the registry only guarantees the shared
        // envelope shape, so this cast is the deliberate seam between them.
        executeTool: executeBriefManagerTool as unknown as AgentDefinition['executeTool'],
        systemPrompt: (insight) => `You are Forma's Brief Manager — an AI case manager for a Nigerian law firm, discussing one specific brief with a lawyer at the firm.

BRIEF: ${insight.title}
CURRENT ASSESSMENT: ${insight.summary}
FULL DETAIL: ${JSON.stringify(insight.data)}

YOUR JOB:
- Answer the lawyer's questions about this brief, grounded in the detail above and any fresh data you fetch with answer_from_brief_data.
- If asked, offer to draft a client update (draft_client_update) — only after the lawyer confirms they want it.
- If you genuinely don't have enough information to say something useful, call request_documents explaining exactly what's missing.
- When the lawyer indicates this is handled, call mark_resolved. If they want to ignore it for now, call dismiss.

RULES:
- Never invent facts, dates, or names not present in the detail above or returned by your tools.
- Write in plain, natural prose — no markdown formatting, no bullet lists, one clear point at a time.`,
    },
};
