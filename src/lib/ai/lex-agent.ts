import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface LexMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    functionCall?: {
        name: string;
        arguments: string;
    };
}

export interface LexFunctionCall {
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

When users ask you to perform actions, use the available functions to interact with the Reforma system.

Be concise, professional, and helpful. Use Nigerian English and understand local legal terminology.

Current date: ${new Date().toLocaleDateString('en-NG')}`;

export async function chatWithLex(
    messages: LexMessage[],
    availableFunctions: any[]
): Promise<{ message: string; functionCalls?: LexFunctionCall[] }> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: LEX_SYSTEM_PROMPT },
                ...messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
            functions: availableFunctions,
            function_call: 'auto',
            temperature: 0.7,
            max_tokens: 500,
        });

        const choice = response.choices[0];
        const message = choice.message;

        // Check if function was called
        if (message.function_call) {
            return {
                message: message.content || '',
                functionCalls: [
                    {
                        name: message.function_call.name,
                        arguments: JSON.parse(message.function_call.arguments),
                        result: null, // Will be filled by caller
                    },
                ],
            };
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
    availableFunctions: any[]
): Promise<string> {
    const messages: LexMessage[] = [
        ...conversationHistory,
        { role: 'user', content: userMessage },
    ];

    const response = await chatWithLex(messages, availableFunctions);
    return response.message;
}
