import OpenAI from 'openai';
import { config } from '@/lib/config';
import { AgentContext, HistoryMessage } from './types';
import { TOOLS, executeTool, buildSystemPrompt } from './brief-manager';

// OpenAI-driven agentic loop for the WhatsApp Brief Manager — same tool
// schemas, same tool implementations, same system prompt as the Anthropic
// path in brief-manager.ts. Only the "which LLM drives the loop" mechanics
// differ, since Anthropic and OpenAI shape tool calls and messages
// differently. See runBriefManager (index.ts) for the provider router.

function toOpenAITools(): OpenAI.Chat.ChatCompletionTool[] {
    return TOOLS.map(t => ({
        type: 'function' as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema as Record<string, unknown>,
        },
    }));
}

export async function runBriefManagerOpenAI(
    message: string,
    ctx: AgentContext,
    history: HistoryMessage[],
): Promise<string> {
    const apiKey = config.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const client = new OpenAI({ apiKey });
    const tools = toOpenAITools();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: buildSystemPrompt(ctx) },
        ...history.map(h => ({ role: h.role, content: h.content }) as OpenAI.Chat.ChatCompletionMessageParam),
        { role: 'user', content: message },
    ];

    let iterations = 0;
    while (iterations < 10) {
        iterations++;
        const response = await client.chat.completions.create({
            model: config.OPENAI_MODEL,
            max_tokens: 4096,
            tools,
            messages,
        });

        const choice = response.choices[0];
        if (!choice) break;

        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
            messages.push(choice.message);

            for (const toolCall of choice.message.tool_calls) {
                if (toolCall.type !== 'function') continue;
                let input: Record<string, unknown> = {};
                try {
                    input = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
                } catch {
                    // Malformed arguments — let executeTool's default case report it
                }
                const result = await executeTool(toolCall.function.name, input, ctx);
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                });
            }
            continue;
        }

        if (choice.message.content) {
            return choice.message.content.trim();
        }

        break;
    }

    return 'I was unable to complete your request. Please try again.';
}
