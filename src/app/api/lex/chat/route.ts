import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chatWithLex } from '@/lib/ai/lex-agent';
import { COMPREHENSIVE_LEX_FUNCTIONS } from '@/lib/ai/comprehensive-functions';
import { LEX_FUNCTION_IMPLEMENTATIONS } from '@/lib/ai/function-implementations';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, conversationId } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const workspaceId = session.user.workspaceId;
        const userId = session.user.id;

        // Get or create conversation
        let conversation;
        if (conversationId) {
            conversation = await prisma.lexConversation.findUnique({
                where: { id: conversationId },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
            });
        } else {
            conversation = await prisma.lexConversation.create({
                data: {
                    workspaceId,
                    userId,
                },
                include: { messages: true },
            });
        }

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Build conversation history
        const conversationHistory = conversation.messages.map(m => {
            const msg: any = {
                role: m.role,
                content: m.content,
            };

            // Restore tool_calls or tool_call_id from functionCalls JSON
            if (m.functionCalls) {
                const fc = m.functionCalls as any;
                if (Array.isArray(fc)) {
                    // It's a tool_calls array (assistant message)
                    msg.tool_calls = fc;
                } else if (fc.tool_call_id) {
                    // It's a tool result (tool message)
                    msg.tool_call_id = fc.tool_call_id;
                    // Ensure role is tool
                    msg.role = 'tool';
                }
            }
            return msg;
        });

        // Prepare tools
        const tools = COMPREHENSIVE_LEX_FUNCTIONS.map(fn => ({
            type: 'function' as const,
            function: fn,
        }));

        // Initial messages
        const currentMessages = [...conversationHistory, { role: 'user', content: message }];

        // Call Lex AI
        let response = await chatWithLex(currentMessages, tools);
        let finalMessage = response.message;
        let functionResult = null;

        // Save User message first
        await prisma.lexMessage.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: message,
            },
        });

        // Handle tool calls
        if (response.toolCalls && response.toolCalls.length > 0) {
            // 1. Save Assistant message with tool calls
            await prisma.lexMessage.create({
                data: {
                    conversationId: conversation.id,
                    role: 'assistant',
                    content: response.message || '',
                    functionCalls: response.toolCalls.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.arguments)
                        }
                    })) as any,
                },
            });

            // Append to current messages for next turn
            currentMessages.push({
                role: 'assistant',
                content: response.message || null,
                tool_calls: response.toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                        name: tc.name,
                        arguments: JSON.stringify(tc.arguments)
                    }
                }))
            });

            // 2. Execute tools
            for (const toolCall of response.toolCalls) {
                const functionName = toolCall.name;
                const functionImpl = LEX_FUNCTION_IMPLEMENTATIONS[functionName as keyof typeof LEX_FUNCTION_IMPLEMENTATIONS];

                let result = { error: `Function ${functionName} not found` };
                if (functionImpl) {
                    try {
                        const args = { ...toolCall.arguments, workspaceId };
                        result = await (functionImpl as any)(args);
                    } catch (err: any) {
                        result = { error: err.message };
                    }
                }

                // Save Tool message
                await prisma.lexMessage.create({
                    data: {
                        conversationId: conversation.id,
                        role: 'tool',
                        content: JSON.stringify(result),
                        functionCalls: { tool_call_id: toolCall.id } as any,
                    },
                });

                // Append to current messages
                currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                    name: functionName
                } as any);

                if (!functionResult) functionResult = result;
            }

            // 3. Get final response
            response = await chatWithLex(currentMessages, tools);
            finalMessage = response.message;
        }

        // Save final assistant response
        await prisma.lexMessage.create({
            data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: finalMessage,
            },
        });

        return NextResponse.json({
            message: finalMessage,
            conversationId: conversation.id,
            functionResult,
        });
    } catch (error: any) {
        console.error('Lex chat error:', error);
        return NextResponse.json(
            { error: 'Failed to process message', details: error.message },
            { status: 500 }
        );
    }
}
