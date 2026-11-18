import { prisma } from '@/lib/prisma';
import { reviewFilingDocument } from '@/lib/filing-checklist/review';
import { generateStandardDocument } from '@/lib/drafting/standard-documents';
import { guessDocumentCategory } from './document-category';
import { recordLedgerEntries } from './ledger';
import { findOrCreateOpenGap } from './gaps';
import { extractDocumentMeta, captureDocument } from './document-capture';
import { matchBriefByCaseTitle } from './resolve-brief';
import type { JuniorAgent } from './junior';
import type { ResolvedBrief } from './resolve-brief';

interface DispatchContext {
    input: string;
    brief: ResolvedBrief;
    workspaceId: string;
    userId: string;
}

export type DispatchResult =
    | { kind: 'text'; title: string; text: string }
    | { kind: 'ledger'; items: { desc: string; cat: string; amt: number }[]; total: number }
    | { kind: 'gap'; gapId: string; text: string; hint: string | null }
    | { kind: 'document'; documentId: string; name: string; docType: string; briefName: string }
    | { kind: 'error'; text: string };

/**
 * Runs the specialist Junior routed to, for everything except First Draft
 * (which needs its own multi-step identify/confirm flow — see
 * first-draft-flow.ts, driven directly from actions.ts). Each case calls
 * the real function that already exists for that capability. Where a
 * capability genuinely isn't built yet (Authority Search), it says so
 * plainly instead of faking a result.
 */
export async function dispatchAgent(agent: Exclude<JuniorAgent, 'first_draft'>, ctx: DispatchContext): Promise<DispatchResult> {
    try {
        switch (agent) {
            case 'proofread': {
                const text = await reviewFilingDocument(ctx.input, 'Court Filing');
                return { kind: 'text', title: 'Proofread', text };
            }

            case 'standard_document': {
                if (!ctx.brief) {
                    return { kind: 'error', text: 'Standard Documents needs a brief reference to pull facts from.' };
                }
                const category = guessDocumentCategory(ctx.input);
                if (!category) {
                    return { kind: 'error', text: 'Couldn\'t tell which document type this is — name it directly (e.g. "CTC application", "search application", "deed of lease", "tenancy agreement").' };
                }
                const result = await generateStandardDocument(ctx.workspaceId, category, {}, ctx.brief.id);
                if (result.error) return { kind: 'error', text: result.error };
                if (result.missingFields && result.missingFields.length > 0) {
                    return { kind: 'error', text: `${result.documentName ?? 'Document'}: still missing ${result.missingFields.join(', ')}.` };
                }
                return { kind: 'text', title: result.documentName ?? 'Standard Document', text: result.text ?? '' };
            }

            case 'deadline_watch': {
                if (!ctx.brief?.matter) {
                    return { kind: 'error', text: 'Deadline Watch needs a brief reference to look up.' };
                }
                const latest = await prisma.calendarEntry.findFirst({
                    where: { matterId: ctx.brief.matter.id, deletedAt: null },
                    orderBy: { date: 'desc' },
                });
                if (!latest?.adjournedTo) {
                    const gap = await findOrCreateOpenGap(
                        ctx.workspaceId,
                        ctx.brief.id,
                        `No next date recorded for ${ctx.brief.matter.name}.`,
                        'e.g. Adjourned to 4 December for hearing',
                    );
                    return { kind: 'gap', gapId: gap.id, text: gap.text, hint: gap.hint };
                }
                const lastReported = latest.date.toLocaleDateString('en-GB', { dateStyle: 'long' });
                const adjourned = latest.adjournedTo.toLocaleDateString('en-GB', { dateStyle: 'long' });
                const reason = latest.adjournedFor ? ` for ${latest.adjournedFor}` : '';
                return {
                    kind: 'text',
                    title: 'Deadline Watch',
                    text: `${ctx.brief.matter.name}\n\n${adjourned}${reason} (last reported ${lastReported}).`,
                };
            }

            case 'ledger':
                return recordLedgerEntries(ctx.workspaceId, ctx.input, ctx.brief?.matter?.id ?? null);

            case 'brief_status': {
                if (!ctx.brief) {
                    return { kind: 'error', text: 'Brief Status needs a brief reference to scan.' };
                }
                const { generateBriefSummary } = await import('@/app/actions/briefs');
                const result = await generateBriefSummary(ctx.brief.id);
                if (!result.success || !result.data) {
                    return { kind: 'error', text: result.error ?? 'Could not generate a summary for this brief.' };
                }
                return { kind: 'text', title: 'Brief Status', text: result.data.prose };
            }

            case 'document_capture': {
                const meta = await extractDocumentMeta(ctx.input);
                const targetBrief = ctx.brief ?? await matchBriefByCaseTitle(ctx.workspaceId, meta.caseTitle);
                if (!targetBrief) {
                    return {
                        kind: 'text',
                        title: 'Document',
                        text: `This reads like a document to file, but Junior can't tell which brief it belongs to — open the brief first, then paste it in, and it'll be filed there and remembered from then on.`,
                    };
                }
                const filed = await captureDocument(targetBrief.id, meta.title, ctx.input);
                return { kind: 'document', documentId: filed.documentId, name: filed.name, docType: filed.docType, briefName: targetBrief.name };
            }

            case 'authority_search':
                return {
                    kind: 'text',
                    title: 'Authority Search',
                    text: 'Authority Search isn\'t live yet — it needs a licensed, offline case-law corpus, which hasn\'t been set up. Once that\'s in place, this agent searches it directly rather than querying the open internet, so client facts never leave the firm.',
                };

            default:
                return { kind: 'error', text: 'Junior couldn\'t tell which agent this belongs to — try being more specific.' };
        }
    } catch (err) {
        console.error(`[ai-native] ${agent} dispatch failed:`, err);
        return { kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong running that agent.' };
    }
}
