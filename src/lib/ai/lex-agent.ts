import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openaiClient: OpenAI | null = null;
function getOpenAIClient() {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}

export interface LexMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    tool_calls?: {
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }[];
    tool_call_id?: string;
    name?: string;
}

export interface LexToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
    result: any;
}

export const LEX_SYSTEM_PROMPT = `You are Lex, an AI assistant specialized in helping Nigerian law firms manage their legal operations.

Your capabilities include:
- Managing matters, tasks, and deadlines
- Tracking and categorizing expenses
- Organizing documents and briefs
- Monitoring NDPA compliance
- Providing operational insights
- Answering questions about firm data

You are NOT a legal research assistant. You do NOT provide legal advice. You help with operational and administrative tasks.

When users ask you to perform actions, use the available tools to interact with the Reforma system.

Be concise, professional, and helpful. Use Nigerian English and understand local legal terminology.

Current date: ${new Date().toLocaleDateString('en-NG')}`;

export async function chatWithLex(
    messages: LexMessage[],
    availableTools: any[]
): Promise<{ message: string; toolCalls?: LexToolCall[] }> {
    try {
        const openai = getOpenAIClient();
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: messages as any,
            tools: availableTools.length > 0 ? availableTools : undefined,
            tool_choice: availableTools.length > 0 ? 'auto' : undefined,
            temperature: 0.7,
            max_tokens: 500,
        });


        const choice = response.choices[0];
        const message = choice.message;

        // Check if tool was called
        if (message.tool_calls && message.tool_calls.length > 0) {
            // Filter to only function tool calls (not custom tool calls)
            const functionToolCalls = message.tool_calls.filter(
                (tc): tc is typeof tc & { function: { name: string; arguments: string } } =>
                    'function' in tc
            );

            if (functionToolCalls.length > 0) {
                return {
                    message: message.content || '',
                    toolCalls: functionToolCalls.map(tc => ({
                        id: tc.id,
                        name: tc.function.name,
                        arguments: JSON.parse(tc.function.arguments),
                        result: null, // Will be filled by caller
                    })),
                };
            }
        }

        return {
            message: message.content || 'I apologize, I could not process that request.',
        };
    } catch (error) {
        console.error('Lex chat error:', error);
        throw new Error('Failed to communicate with Lex');
    }
}

export async function generateLexResponse(
    userMessage: string,
    conversationHistory: LexMessage[],
    availableTools: any[]
): Promise<string> {
    const messages: LexMessage[] = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
    ];

    const response = await chatWithLex(messages, availableTools);
    return response.message;
}
