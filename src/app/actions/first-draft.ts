'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-utils';
import { mailService } from '@/lib/services/mail/mail';

export async function getPendingDrafts(workspaceId: string) {
    return prisma.clientUpdateDraft.findMany({
        where: { workspaceId, status: 'pending' },
        orderBy: { createdAt: 'desc' },
        include: {
            matter: { select: { name: true, client: { select: { name: true, email: true } } } },
            calendarEntry: { select: { date: true, proceedings: true, outcome: true } },
        },
    });
}

export async function discardDraft(draftId: string) {
    await requireAuth();
    await prisma.clientUpdateDraft.update({ where: { id: draftId }, data: { status: 'discarded' } });
    revalidatePath('/first-draft');
    return { success: true };
}

/**
 * The only way a First Draft client update actually reaches a client —
 * takes whatever text the lawyer is looking at (edited or not), so
 * draftText vs finalText becomes a real edit-delta signal, not a formality.
 */
export async function sendDraft(draftId: string, finalText: string) {
    const user = await requireAuth();

    const draft = await prisma.clientUpdateDraft.findUnique({
        where: { id: draftId },
        include: {
            matter: {
                select: { name: true, clientId: true, client: { select: { email: true } } },
            },
        },
    });
    if (!draft) return { success: false, error: 'Draft not found' };
    if (draft.status !== 'pending') return { success: false, error: 'This draft has already been sent or discarded' };

    const clientEmail = draft.matter.client?.email;
    if (!clientEmail || !draft.matter.clientId) {
        return { success: false, error: 'This matter has no client email on file — add one before sending.' };
    }

    const subject = `Update on ${draft.matter.name}`;
    const result = await mailService.send({
        to: clientEmail,
        subject,
        html: `<p>${finalText.replace(/\n/g, '<br/>')}</p>`,
        text: finalText,
    });
    if (!result.success) return { success: false, error: 'Failed to send the email — try again.' };

    const now = new Date();
    await prisma.$transaction([
        prisma.clientUpdateDraft.update({
            where: { id: draftId },
            data: { status: 'sent', finalText, approvedAt: now, approvedById: user.id, sentAt: now },
        }),
        prisma.clientCommunication.create({
            data: {
                matterId: draft.matterId,
                clientId: draft.matter.clientId,
                communicationType: 'email',
                subject,
                summary: finalText.slice(0, 500),
                sentBy: user.id,
                sentAt: now,
            },
        }),
    ]);

    revalidatePath('/first-draft');
    return { success: true };
}
