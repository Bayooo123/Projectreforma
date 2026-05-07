'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getPendingMatterQuestions(workspaceId: string) {
    const session = await auth();
    if (!session?.user?.id) return [];

    const userId = session.user.id;

    // Route questions only to lawyers who are assigned to the matter
    // (primary handler or appearing lawyer), so no one gets questions
    // about matters they have no role in.
    return prisma.matterQuestion.findMany({
        where: {
            workspaceId,
            status: 'pending',
            matter: {
                OR: [
                    { lawyerInChargeId: userId },
                    { lawyers: { some: { lawyerId: userId } } },
                ],
            },
        },
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
