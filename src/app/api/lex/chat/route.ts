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
        const conversationHistory = conversation.messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
        }));

        // Call Lex AI
        const response = await chatWithLex(
            [...conversationHistory, { role: 'user', content: message }],
            COMPREHENSIVE_LEX_FUNCTIONS
        );

        // If function was called, execute it
        let finalMessage = response.message;
        let functionResult = null;

        if (response.functionCalls && response.functionCalls.length > 0) {
            const functionCall = response.functionCalls[0];
            const functionName = functionCall.name;
            const functionImpl = LEX_FUNCTION_IMPLEMENTATIONS[functionName as keyof typeof LEX_FUNCTION_IMPLEMENTATIONS];

            if (functionImpl) {
                try {
                    // Add workspaceId to function arguments
                    const args = { ...functionCall.arguments, workspaceId };
                    functionResult = await functionImpl(args);

                    // Generate response based on function result
                    const followUpResponse = await chatWithLex(
                        [
                            ...conversationHistory,
                            { role: 'user', content: message },
                            {
                                role: 'assistant',
                                content: `Function ${functionName} executed with result: ${JSON.stringify(functionResult)}`,
                            },
                        ],
                        []
                    );

                    finalMessage = followUpResponse.message;
                } catch (error: any) {
                    finalMessage = `I encountered an error: ${error.message}. Please try again.`;
                }
            }
        }

        // Save messages to database
        await prisma.lexMessage.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: message,
            },
        });

        await prisma.lexMessage.create({
            data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: finalMessage,
                functionCalls: functionResult ? { result: functionResult } : null,
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
