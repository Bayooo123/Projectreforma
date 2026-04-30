'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getPendingMatterQuestions(workspaceId: string) {
    const session = await auth();
    if (!session?.user?.id) return [];

    return prisma.matterQuestion.findMany({
        where: { workspaceId, status: 'pending' },
        include: {
            matter: { select: { id: true, name: true, caseNumber: true, court: true } },
            calendarEntry: { select: { id: true, date: true, title: true, type: true } },
        },
        orderBy: { askedAt: 'desc' },
    });
}

export async function answerMatterQuestion(questionId: string, answer: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const question = await prisma.matterQuestion.findUnique({
        where: { id: questionId },
        select: { calendarEntryId: true, workspaceId: true },
    });
    if (!question) return { success: false, error: 'Question not found' };

    await prisma.$transaction([
        prisma.matterQuestion.update({
            where: { id: questionId },
            data: {
                status: 'answered',
                answer,
                answeredAt: new Date(),
                answeredById: session.user.id,
            },
        }),
        prisma.calendarEntry.update({
            where: { id: question.calendarEntryId },
            data: { proceedings: answer },
        }),
    ]);

    revalidatePath('/pulse');
    revalidatePath('/calendar');
    return { success: true };
}

export async function dismissMatterQuestion(questionId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    await prisma.matterQuestion.update({
        where: { id: questionId },
        data: { status: 'dismissed' },
    });

    revalidatePath('/pulse');
    return { success: true };
}
