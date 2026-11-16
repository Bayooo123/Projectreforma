import { prisma } from '@/lib/prisma';
import { assembleClientUpdateLetter } from '@/lib/drafting/client-update-letter';
import { extractCaseFacts, type ExtractedCaseFacts } from './case-extraction';
import { resolveBrief, matchBriefByCaseTitle, type ResolvedBrief } from './resolve-brief';

export type FirstDraftIdentification =
    | { status: 'matched'; brief: NonNullable<ResolvedBrief>; facts: ExtractedCaseFacts }
    | { status: 'confirm'; facts: ExtractedCaseFacts };

/**
 * First Draft's real entry point: does this update belong to a brief we
 * already have, or not? Tries the explicit reference first, then falls
 * back to matching the case title pulled straight out of the lawyer's own
 * text — the "EL-BETHEL V. SHONAME" in the Appearances line, not something
 * the lawyer has to additionally type into a field.
 */
export async function identifyForFirstDraft(workspaceId: string, input: string, briefRef: string): Promise<FirstDraftIdentification> {
    const facts = await extractCaseFacts(input);

    let brief: ResolvedBrief = null;
    if (briefRef?.trim()) brief = await resolveBrief(workspaceId, briefRef.trim());
    if (!brief?.matter) brief = await matchBriefByCaseTitle(workspaceId, facts.caseTitle);

    if (brief?.matter) return { status: 'matched', brief, facts };
    return { status: 'confirm', facts };
}

/**
 * Records the proceeding (a real CalendarEntry, not just a letter in a
 * vacuum) and drafts the client update against it — the same shape First
 * Draft already produces elsewhere, persisted as a real ClientUpdateDraft
 * so a lawyer's edit to it becomes training signal later.
 */
export async function buildDraftForMatter(
    workspaceId: string,
    userId: string,
    matter: { id: string; name: string; caseNumber: string | null },
    clientNameRaw: string | null,
    input: string,
    facts: ExtractedCaseFacts,
) {
    const [user, calendarEntry] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true, jobTitle: true } }),
        prisma.calendarEntry.create({
            data: {
                matterId: matter.id,
                date: new Date(),
                proceedings: facts.proceedings || input,
                adjournedTo: facts.adjournedTo ? new Date(facts.adjournedTo) : null,
                type: 'COURT',
            },
        }),
    ]);

    const letter = await assembleClientUpdateLetter(
        { name: clientNameRaw ?? 'the client', company: null },
        { name: matter.name, caseNumber: matter.caseNumber },
        { name: user?.name ?? 'Counsel', jobTitle: user?.jobTitle },
        input,
    );

    const draft = await prisma.clientUpdateDraft.create({
        data: { workspaceId, matterId: matter.id, calendarEntryId: calendarEntry.id, draftText: letter.markdown },
    });

    return { draftId: draft.id, title: letter.title, markdown: letter.markdown };
}

/** Creates the brief/matter from scratch once a lawyer has confirmed there's no existing one to use. */
export async function createBriefForFacts(workspaceId: string, userId: string, facts: ExtractedCaseFacts) {
    const name = facts.caseTitle?.trim() || 'Untitled matter';

    const matter = await prisma.matter.create({
        data: { workspaceId, name, court: facts.court, judge: facts.judge, clientNameRaw: facts.claimantName },
    });

    const brief = await prisma.brief.create({
        data: {
            workspaceId,
            matterId: matter.id,
            lawyerId: userId,
            name,
            category: 'Litigation',
            briefNumber: `AI-${Date.now()}`,
        },
    });

    return { brief, matter };
}
