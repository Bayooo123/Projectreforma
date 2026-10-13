import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { assemblePostCourtContext } from './context';
import { DraftingService } from '@/lib/drafting/drafting-service';
import { sendGatedEmailNudge } from '@/lib/notify/email-gate';
import { getFirstDraftReadyEmail } from '@/lib/services/mail/templates';

interface TriggerParams {
    workspaceId: string;
    matterId: string;
    calendarEntryId: string;
    /** The lawyer who logged the event — gets the "draft ready" notification. */
    userId: string;
}

/**
 * First Draft's post-court-update trigger. Called after recordProceeding/
 * adjournMatter commit their CalendarEntry — never inline in that
 * transaction, so a drafting failure (missing API key, a model error)
 * can't roll back or delay the write the lawyer is actually waiting on.
 *
 * Failure here is swallowed and logged, not thrown — logging a court
 * attendance must never fail because First Draft had a bad day.
 */
export async function triggerFirstDraftForCourtEvent(params: TriggerParams): Promise<void> {
    try {
        const context = await assemblePostCourtContext(params.matterId, params.calendarEntryId);
        const draftText = await DraftingService.generateClientUpdateDraft(context);

        const [draft, matter, user] = await Promise.all([
            prisma.clientUpdateDraft.create({
                data: {
                    workspaceId: params.workspaceId,
                    matterId: params.matterId,
                    calendarEntryId: params.calendarEntryId,
                    draftText,
                },
            }),
            prisma.matter.findUnique({ where: { id: params.matterId }, select: { name: true } }),
            prisma.user.findUnique({ where: { id: params.userId }, select: { email: true } }),
        ]);

        if (user?.email) {
            const matterName = matter?.name || 'a matter';
            await sendGatedEmailNudge({
                workspaceId: params.workspaceId,
                userId: params.userId,
                to: user.email,
                subject: `Client update ready for review — ${matterName}`,
                html: getFirstDraftReadyEmail(matterName, `${config.NEXT_PUBLIC_APP_URL}/first-draft`),
                triggerType: 'first_draft_ready',
                resourceId: draft.id,
                resourceName: matterName,
            });
        }
    } catch (err) {
        console.error('[FirstDraft] Failed to generate post-court draft:', err);
    }
}
