import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { getClaudeTools, executeTool } from '@/lib/eureka/tools';

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
- Creating new clients, matters, briefs, and court dates

When creating records:
- Always confirm back what was created with the name and ID
- If required information is missing, ask for it before proceeding
- For court dates, ask for the date, matter, and court if not provided

When referencing specific records, always include a markdown deep link so the user can navigate directly:
- Briefs: [Brief Name](/briefs/BRIEF_ID)
- Court dates / calendar: [View Calendar](/calendar)
- Clients: [Client Name](/management/clients)`;

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

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
        }

        const { messages } = await req.json();
        if (!messages?.length) {
            return NextResponse.json({ error: 'No messages' }, { status: 400 });
        }

        const client = new Anthropic({ apiKey });

        const claudeMessages: Anthropic.MessageParam[] = messages.map(
            (m: { role: string; content: string }) => ({
                role: m.role === 'user' ? 'user' : 'assistant' as const,
                content: m.content,
            })
        );

        let currentMessages = [...claudeMessages];
        let response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: getClaudeTools(),
            messages: currentMessages,
        });

        let iterations = 0;

        while (response.stop_reason === 'tool_use' && iterations < 10) {
            iterations++;

            const toolUseBlocks = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            );

            const toolResults = await Promise.all(
                toolUseBlocks.map(async (block) => {
                    const output = await executeTool(
                        block.name,
                        block.input as Record<string, any>,
                        workspaceId,
                        session.user.id
                    );
                    return {
                        type: 'tool_result' as const,
                        tool_use_id: block.id,
                        content: JSON.stringify(output),
                    };
                })
            );

            currentMessages = [
                ...currentMessages,
                { role: 'assistant' as const, content: response.content },
                { role: 'user' as const, content: toolResults },
            ];

            response = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                tools: getClaudeTools(),
                messages: currentMessages,
            });
        }

        const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
        return NextResponse.json({ message: textBlock?.text || 'No response generated.' });

    } catch (error: any) {
        console.error('[Eureka] Error:', error);
        const msg = error.message ?? '';
        if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('overloaded')) {
            return NextResponse.json({ message: "I'm temporarily unavailable due to high demand. Please try again in a minute." });
        }
        if (msg.includes('503') || msg.includes('Service Unavailable')) {
            return NextResponse.json({ message: "The AI service is experiencing high demand right now. Please try again in a few seconds." });
        }
        return NextResponse.json({ message: "Something went wrong on my end. Please try again." });
    }
}
