import { prisma } from '@/lib/prisma';
import { reviewFilingDocument } from '@/lib/filing-checklist/review';
import { generateStandardDocument } from '@/lib/drafting/standard-documents';
import { assembleClientUpdateLetter } from '@/lib/drafting/client-update-letter';
import { guessDocumentCategory } from './document-category';
import { recordLedgerEntries } from './ledger';
import type { JuniorAgent } from './junior';
import type { ResolvedBrief } from './resolve-brief';

interface DispatchContext {
    input: string;
    brief: ResolvedBrief;
    workspaceId: string;
    userId: string;
}

type DispatchResult =
    | { success: true; title: string; markdown: string }
    | { error: string };

/**
 * Runs the specialist Junior routed to. Each case calls the real function
 * that already exists for that capability — nothing here is a mock. Where
 * a capability genuinely isn't built yet (Authority Search), it says so
 * plainly instead of faking a result.
 */
export async function dispatchAgent(agent: JuniorAgent, ctx: DispatchContext): Promise<DispatchResult> {
    try {
        switch (agent) {
            case 'first_draft': {
                if (!ctx.brief?.matter) {
                    return { error: 'First Draft needs a matter to write to — give a brief reference first.' };
                }
                const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true, jobTitle: true } });
                const letter = await assembleClientUpdateLetter(
                    { name: ctx.brief.client?.name ?? 'the client', company: ctx.brief.client?.company ?? null },
                    { name: ctx.brief.matter.name, caseNumber: ctx.brief.matter.caseNumber },
                    { name: user?.name ?? 'Counsel', jobTitle: user?.jobTitle },
                    ctx.input,
                );
                return { success: true, title: letter.title, markdown: letter.markdown };
            }

            case 'proofread': {
                const result = await reviewFilingDocument(ctx.input, 'Court Filing');
                return { success: true, title: 'Proofread', markdown: result };
            }

            case 'standard_document': {
                if (!ctx.brief) {
                    return { error: 'Standard Documents needs a brief reference to pull facts from.' };
                }
                const category = guessDocumentCategory(ctx.input);
                if (!category) {
                    return { error: 'Couldn\'t tell which document type this is — name it directly (e.g. "CTC application", "search application", "deed of lease", "tenancy agreement").' };
                }
                const result = await generateStandardDocument(ctx.workspaceId, category, {}, ctx.brief.id);
                if (result.error) return { error: result.error };
                if (result.missingFields && result.missingFields.length > 0) {
                    return { error: `${result.documentName ?? 'Document'}: still missing ${result.missingFields.join(', ')}.` };
                }
                return { success: true, title: result.documentName ?? 'Standard Document', markdown: result.text ?? '' };
            }

            case 'deadline_watch': {
                if (!ctx.brief?.matter) {
                    return { error: 'Deadline Watch needs a brief reference to look up.' };
                }
                const entries = await prisma.calendarEntry.findMany({
                    where: { matterId: ctx.brief.matter.id, deletedAt: null },
                    orderBy: { date: 'desc' },
                    take: 5,
                });
                if (entries.length === 0) {
                    return { success: true, title: 'Deadline Watch', markdown: 'No calendar entries recorded for this matter yet.' };
                }
                const lines = entries.map(e => {
                    const date = e.date.toLocaleDateString('en-GB', { dateStyle: 'long' });
                    const adjourned = e.adjournedTo ? ` — adjourned to ${e.adjournedTo.toLocaleDateString('en-GB', { dateStyle: 'long' })}` : '';
                    const reason = e.adjournedFor ? ` (${e.adjournedFor})` : '';
                    return `- ${date}${adjourned}${reason}`;
                });
                return { success: true, title: 'Deadline Watch', markdown: lines.join('\n') };
            }

            case 'ledger':
                return recordLedgerEntries(ctx.workspaceId, ctx.input);

            case 'authority_search':
                return {
                    success: true,
                    title: 'Authority Search',
                    markdown: 'Authority Search isn\'t live yet — it needs a licensed, offline case-law corpus, which hasn\'t been set up. Once that\'s in place, this agent searches it directly rather than querying the open internet, so client facts never leave the firm.',
                };

            default:
                return { error: 'Junior couldn\'t tell which agent this belongs to — try being more specific.' };
        }
    } catch (err) {
        console.error(`[ai-native] ${agent} dispatch failed:`, err);
        return { error: err instanceof Error ? err.message : 'Something went wrong running that agent.' };
    }
}
