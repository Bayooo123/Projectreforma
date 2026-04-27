import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTools, executeTool } from '@/lib/eureka/tools';

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

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
- Lawyer performance and workload
- Deadline and risk flagging`;

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

        const { messages } = await req.json();
        if (!messages?.length) {
            return NextResponse.json({ error: 'No messages' }, { status: 400 });
        }

        const tools = getTools();

        // Agentic loop — Claude may call multiple tools before responding
        let currentMessages = [...messages];
        let iterations = 0;
        const MAX_ITERATIONS = 10;

        while (iterations < MAX_ITERATIONS) {
            iterations++;

            const response = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                tools,
                messages: currentMessages,
            });

            // If Claude wants to use tools, execute them and continue the loop
            if (response.stop_reason === 'tool_use') {
                const assistantMessage = { role: 'assistant' as const, content: response.content };
                currentMessages = [...currentMessages, assistantMessage];

                const toolResults = await Promise.all(
                    response.content
                        .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
                        .map(async (toolUse) => {
                            const result = await executeTool(toolUse.name, toolUse.input as Record<string, any>, workspaceId);
                            return {
                                type: 'tool_result' as const,
                                tool_use_id: toolUse.id,
                                content: JSON.stringify(result),
                            };
                        })
                );

                currentMessages = [...currentMessages, { role: 'user' as const, content: toolResults }];
                continue;
            }

            // Final text response
            const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
            return NextResponse.json({
                message: textBlock?.text ?? 'No response generated.',
                usage: response.usage,
            });
        }

        return NextResponse.json({ message: 'I reached the maximum number of steps. Please try a more specific question.' });

    } catch (error: any) {
        console.error('[Eureka] Error:', error);
        return NextResponse.json({ error: error.message ?? 'Unexpected error' }, { status: 500 });
    }
}
