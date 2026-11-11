import { prisma } from '@/lib/prisma';
import { assemblePostCourtContext } from './context';
import { assembleClientUpdateLetter } from '@/lib/drafting/client-update-letter';
import { markdownToDocxBuffer } from '@/lib/documents/markdown-to-docx';
import { sendGatedWhatsAppDocument } from '@/lib/agents/whatsapp/notify-gate';

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
 * Runs as a ProcessingJob (src/lib/jobs/handlers.ts), not called directly —
 * that's why this throws on failure instead of swallowing it: the job
 * dispatcher is what catches it now, and needs the error to retry with
 * backoff. Letting a court-date write fail because of this is still
 * prevented, just one layer up (enqueueing, not this function, is what
 * happens inline with the mutation).
 *
 * Delivery is a letterhead .docx on WhatsApp, not an email nudge — the
 * lawyer gets the actual drafted letter to review, not a link to go open
 * Reforma for it. The ClientUpdateDraft row still exists for the record
 * (and the /first-draft page still works as a log), it's just no longer
 * what tells the lawyer a draft is ready.
 */
export async function triggerFirstDraftForCourtEvent(params: TriggerParams): Promise<void> {
    // Retries are real now that this runs as a ProcessingJob — a retry after
    // a late crash (draft created and sent, but the job never got marked
    // complete) must not create a second draft or re-send the document.
    const existing = await prisma.clientUpdateDraft.findFirst({ where: { calendarEntryId: params.calendarEntryId } });
    if (existing) return;

    const [context, matter, user, workspace] = await Promise.all([
        assemblePostCourtContext(params.matterId, params.calendarEntryId),
        prisma.matter.findUnique({
            where: { id: params.matterId },
            select: { name: true, caseNumber: true, client: { select: { name: true, company: true } } },
        }),
        prisma.user.findUnique({ where: { id: params.userId }, select: { name: true, jobTitle: true, phone: true } }),
        prisma.workspace.findUnique({ where: { id: params.workspaceId }, select: { letterheadUrl: true } }),
    ]);
    if (!matter) throw new Error(`Matter ${params.matterId} not found`);
    if (!user) throw new Error(`User ${params.userId} not found`);

    const letter = await assembleClientUpdateLetter(
        { name: matter.client?.name ?? 'the client', company: matter.client?.company },
        { name: matter.name, caseNumber: matter.caseNumber },
        { name: user.name ?? 'Counsel', jobTitle: user.jobTitle },
        context,
    );

    const draft = await prisma.clientUpdateDraft.create({
        data: {
            workspaceId: params.workspaceId,
            matterId: params.matterId,
            calendarEntryId: params.calendarEntryId,
            draftText: letter.markdown,
        },
    });

    if (!user.phone) return;

    const buffer = await markdownToDocxBuffer(letter.markdown, letter.title, workspace?.letterheadUrl);
    const { put } = await import('@vercel/blob');
    const safeName = letter.title.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 60) || 'Client Update';
    const filename = `${safeName}.docx`;
    const blob = await put(`first-draft/${params.workspaceId}/${Date.now()}-${filename}`, buffer, {
        access: 'public',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await sendGatedWhatsAppDocument({
        workspaceId: params.workspaceId,
        userId: params.userId,
        phone: user.phone.replace(/\D/g, ''),
        url: blob.url,
        filename,
        caption: `Client update draft for ${matter.name} — review before sending.`,
        triggerType: 'first_draft_ready',
        resourceId: draft.id,
        resourceName: matter.name,
    });
}
