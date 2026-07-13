import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import { AgentName } from './types';

const VALID_AGENTS: AgentName[] = ['brief_manager', 'calendar'];

const SYSTEM = `You are a routing assistant for Reforma, a legal practice management system.

Classify the user message into exactly one agent:
- brief_manager: anything about briefs, cases, documents, case chronology, clients, correspondence, legal matters, summarising a case, what happened in a case
- calendar: scheduling, hearings, court dates, meetings, availability, upcoming events, reminders

Reply with ONLY the agent name — no punctuation, no explanation.`;

export async function dispatch(message: string): Promise<AgentName> {
    const apiKey = config.ANTHROPIC_API_KEY;
    if (!apiKey) return 'brief_manager'; // safe default

    const client = new Anthropic({ apiKey });
    try {
        const res = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 20,
            system: SYSTEM,
            messages: [{ role: 'user', content: message }],
        });
        const text = (res.content[0] as { type: string; text: string }).text.trim().toLowerCase();
        return VALID_AGENTS.includes(text as AgentName) ? (text as AgentName) : 'brief_manager';
    } catch {
        return 'brief_manager';
    }
}
