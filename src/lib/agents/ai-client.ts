import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '@/lib/config';

export type AgentProvider = 'openai' | 'anthropic';

const COMPLEX_OPENAI_MODEL = process.env.AGENT_OPENAI_MODEL || config.OPENAI_MODEL || 'gpt-4o';
const QUICK_OPENAI_MODEL = process.env.AGENT_OPENAI_QUICK_MODEL || 'gpt-4o-mini';
const ANTHROPIC_COMPLEX_MODEL = 'claude-sonnet-5';
const ANTHROPIC_QUICK_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Which AI provider the brief/meetings agents (Brief Manager's scan +
 * insight chat) use. Mirrors Ojogbon's own provider selection
 * (src/app/api/ojogbon/ai/route.ts) — set AGENT_AI_PROVIDER to force one,
 * otherwise OpenAI is preferred when configured, falling back to Anthropic.
 */
export function pickAgentProvider(): AgentProvider | null {
    const forced = process.env.AGENT_AI_PROVIDER?.toLowerCase();
    if (forced === 'openai' && config.OPENAI_API_KEY) return 'openai';
    if (forced === 'anthropic' && config.ANTHROPIC_API_KEY) return 'anthropic';
    if (config.OPENAI_API_KEY) return 'openai';
    if (config.ANTHROPIC_API_KEY) return 'anthropic';
    return null;
}

/** Plain JSON-mode completion, no tools — for scan.ts's insight generation. */
export async function completeJSON(opts: { system: string; prompt: string; tier?: 'complex' | 'quick'; maxTokens?: number }): Promise<string> {
    const provider = pickAgentProvider();
    if (!provider) throw new Error('AI is not configured (no OPENAI_API_KEY or ANTHROPIC_API_KEY).');

    if (provider === 'openai') {
        const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        const model = opts.tier === 'quick' ? QUICK_OPENAI_MODEL : COMPLEX_OPENAI_MODEL;
        const res = await client.chat.completions.create({
            model,
            response_format: { type: 'json_object' },
            max_tokens: opts.maxTokens,
            messages: [
                { role: 'system', content: opts.system },
                { role: 'user', content: opts.prompt },
            ],
        });
        return res.choices[0]?.message?.content ?? '';
    }

    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const model = opts.tier === 'quick' ? ANTHROPIC_QUICK_MODEL : ANTHROPIC_COMPLEX_MODEL;
    const res = await client.messages.create({
        model,
        max_tokens: opts.maxTokens ?? 2048,
        system: opts.system,
        messages: [{ role: 'user', content: opts.prompt }],
    });
    return res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');
}

export interface ToolLoopHistoryMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ToolLoopOptions {
    system: string;
    /** Anthropic's tool shape ({name, description, input_schema}) — the one
     * format every agent's tools (BRIEF_MANAGER_TOOLS, MEETINGS_TOOLS) are
     * already written in. Converted to OpenAI's function shape internally
     * when that's the active provider. */
    tools: Anthropic.Tool[];
    history: ToolLoopHistoryMessage[];
    userMessage: string;
    executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>;
    maxIterations?: number;
}

/**
 * The agentic tool-use loop behind Brief Manager/Meetings chat — provider
 * dispatch so it keeps working under either provider's own tool-calling
 * wire format (Anthropic's content-block tool_use/tool_result vs OpenAI's
 * tool_calls/role:"tool"), without the caller (the insight chat route)
 * needing to know which one is active.
 */
export async function runAgentToolLoop(opts: ToolLoopOptions): Promise<string> {
    const provider = pickAgentProvider();
    if (!provider) throw new Error('AI is not configured (no OPENAI_API_KEY or ANTHROPIC_API_KEY).');
    return provider === 'openai' ? runOpenAIToolLoop(opts) : runAnthropicToolLoop(opts);
}

async function runAnthropicToolLoop(opts: ToolLoopOptions): Promise<string> {
    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    let messages: Anthropic.MessageParam[] = [
        ...opts.history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: opts.userMessage },
    ];

    let response = await client.messages.create({
        model: ANTHROPIC_QUICK_MODEL, max_tokens: 1024, system: opts.system, tools: opts.tools, messages,
    });

    let iterations = 0;
    const maxIterations = opts.maxIterations ?? 8;
    while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
        iterations++;
        const toolBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        const results = await Promise.all(toolBlocks.map(async b => ({
            type: 'tool_result' as const,
            tool_use_id: b.id,
            content: JSON.stringify(await opts.executeTool(b.name, b.input as Record<string, unknown>)),
        })));
        messages = [
            ...messages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: results },
        ];
        response = await client.messages.create({
            model: ANTHROPIC_QUICK_MODEL, max_tokens: 1024, system: opts.system, tools: opts.tools, messages,
        });
    }

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    return text?.text ?? 'Done.';
}

async function runOpenAIToolLoop(opts: ToolLoopOptions): Promise<string> {
    const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = opts.tools.map(t => ({
        type: 'function',
        function: {
            name: t.name,
            description: typeof t.description === 'string' ? t.description : undefined,
            parameters: t.input_schema as Record<string, unknown>,
        },
    }));

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: opts.system },
        ...opts.history.map(m => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
        { role: 'user', content: opts.userMessage },
    ];

    let response = await client.chat.completions.create({ model: QUICK_OPENAI_MODEL, messages, tools });

    let iterations = 0;
    const maxIterations = opts.maxIterations ?? 8;
    let choice = response.choices[0];
    while (choice?.finish_reason === 'tool_calls' && iterations < maxIterations) {
        iterations++;
        const toolCalls = choice.message.tool_calls ?? [];
        messages = [...messages, choice.message];
        for (const call of toolCalls) {
            if (call.type !== 'function') continue;
            let input: Record<string, unknown> = {};
            try { input = JSON.parse(call.function.arguments || '{}'); } catch { /* malformed args — pass empty */ }
            const result = await opts.executeTool(call.function.name, input);
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        }
        response = await client.chat.completions.create({ model: QUICK_OPENAI_MODEL, messages, tools });
        choice = response.choices[0];
    }

    return choice?.message?.content ?? 'Done.';
}
