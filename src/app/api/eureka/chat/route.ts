import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/auth';
import { getGeminiTools, executeTool } from '@/lib/eureka/tools';

const SYSTEM_PROMPT = `You are Eureka, the intelligent legal practice assistant built into Reforma OS — a legal practice management platform used by Nigerian law firms.

You have direct access to the firm's live data: matters, clients, court dates, documents, finances, and lawyer activity. Use the tools available to you to answer questions accurately and specifically.

When answering:
- Always query the actual data rather than guessing
- Be specific — use real names, dates, amounts, and case references from the data
- Format monetary values in Naira (₦) with commas (e.g. ₦1,500,000)
- For Nigerian court system context: Federal High Court, State High Court, Magistrate Court, National Industrial Court etc.
- If a question is ambiguous, ask one clarifying question
- Be concise but complete — lawyers are busy

You can help with:
- Matter status, history, and activity summaries
- Client profiles and relationship history
- Court dates, appearances, and schedules
- Financial summaries, outstanding invoices, revenue
- Document analysis and summarisation
- Lawyer performance and workload`;

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
        }

        const workspaceId = session.user.workspaceId;
        if (!workspaceId) {
            return NextResponse.json({ error: 'No workspace' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GOOGLE_API_KEY is not configured.' }, { status: 500 });
        }

        const { messages } = await req.json();
        if (!messages?.length) {
            return NextResponse.json({ error: 'No messages' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations: getGeminiTools() }],
        });

        // Convert message history to Gemini format (exclude last user message — sent separately)
        const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        }));

        const lastMessage = messages[messages.length - 1].content;
        const chat = model.startChat({ history });

        // Agentic loop
        let result = await chat.sendMessage(lastMessage);
        let iterations = 0;

        while (iterations < 10) {
            iterations++;
            const response = result.response;
            const functionCalls = response.functionCalls();

            if (!functionCalls || functionCalls.length === 0) {
                // Final text response
                return NextResponse.json({ message: response.text() });
            }

            // Execute all requested tools
            const toolResults = await Promise.all(
                functionCalls.map(async (call) => {
                    const output = await executeTool(call.name, call.args as Record<string, any>, workspaceId);
                    return {
                        functionResponse: {
                            name: call.name,
                            response: { result: output },
                        },
                    };
                })
            );

            result = await chat.sendMessage(toolResults);
        }

        return NextResponse.json({ message: 'Maximum steps reached. Please try a more specific question.' });

    } catch (error: any) {
        console.error('[Eureka] Error:', error);
        return NextResponse.json({ error: error.message ?? 'Unexpected error' }, { status: 500 });
    }
}
