'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { identifyBriefFromContent } from '@/lib/services/email-processor';

export interface InboxEmail {
    id: string;
    fromEmail: string;
    fromName: string | null;
    subject: string;
    bodyPreview: string | null;
    receivedAt: Date;
    matterId: string | null;
    matterName: string | null;
    briefId: string | null;
    briefName: string | null;
}

export interface InboxBrief {
    id: string;
    briefNumber: string;
    name: string;
    clientName: string | null;
    category: string;
    status: string;
}

export async function getInboxEmails(filter: 'all' | 'unlinked' | 'linked' = 'all'): Promise<InboxEmail[]> {
    const user = await requireAuth();

    const membership = await prisma.workspaceMember.findFirst({
        where: { user: { email: user.email! } },
        select: { workspaceId: true },
    });
    if (!membership) return [];

    const emails = await prisma.inboundEmail.findMany({
        where: {
            workspaceId: membership.workspaceId,
            ...(filter === 'unlinked' ? { matterId: null, clientId: null } : {}),
            ...(filter === 'linked'   ? { OR: [{ matterId: { not: null } }, { clientId: { not: null } }] } : {}),
        },
        select: {
            id: true,
            fromEmail: true,
            fromName: true,
            subject: true,
            bodyPreview: true,
            receivedAt: true,
            matterId: true,
            matter: { select: { name: true } },
        },
        orderBy: { receivedAt: 'desc' },
    });

    // Also pull briefId from PulseEvents
    const emailIds = emails.map(e => e.id);
    const pulseLinks = await prisma.pulseEvent.findMany({
        where: { inboundEmailId: { in: emailIds }, briefId: { not: null } },
        select: {
            inboundEmailId: true,
            briefId: true,
            brief: { select: { name: true } },
        },
    });

    const pulseMap = new Map(pulseLinks.map(p => [p.inboundEmailId!, { briefId: p.briefId!, briefName: p.brief?.name ?? null }]));

    return emails.map(e => ({
        id:          e.id,
        fromEmail:   e.fromEmail,
        fromName:    e.fromName,
        subject:     e.subject,
        bodyPreview: e.bodyPreview,
        receivedAt:  e.receivedAt,
        matterId:    e.matterId,
        matterName:  e.matter?.name ?? null,
        briefId:     pulseMap.get(e.id)?.briefId ?? null,
        briefName:   pulseMap.get(e.id)?.briefName ?? null,
    }));
}

export async function getInboxBriefs(): Promise<InboxBrief[]> {
    const user = await requireAuth();

    const membership = await prisma.workspaceMember.findFirst({
        where: { user: { email: user.email! } },
        select: { workspaceId: true },
    });
    if (!membership) return [];

    const briefs = await prisma.brief.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null, status: { not: 'archived' } },
        select: {
            id: true,
            briefNumber: true,
            name: true,
            category: true,
            status: true,
            client: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    return briefs.map(b => ({
        id:         b.id,
        briefNumber: b.briefNumber,
        name:       b.name,
        clientName: b.client?.name ?? null,
        category:   b.category,
        status:     b.status,
    }));
}

export async function linkEmailToBrief(emailId: string, briefId: string): Promise<{ success: boolean; error?: string }> {
    await requireAuth();

    const [email, brief] = await Promise.all([
        prisma.inboundEmail.findUnique({ where: { id: emailId }, select: { subject: true, workspaceId: true } }),
        prisma.brief.findUnique({ where: { id: briefId }, select: { matterId: true, workspaceId: true, name: true } }),
    ]);

    if (!email || !brief) return { success: false, error: 'Email or brief not found' };
    if (email.workspaceId !== brief.workspaceId) return { success: false, error: 'Workspace mismatch' };

    await Promise.all([
        // Link matter on the InboundEmail if the brief has one
        brief.matterId
            ? prisma.inboundEmail.update({ where: { id: emailId }, data: { matterId: brief.matterId } })
            : Promise.resolve(),
        // Update any existing PulseEvent for this email
        prisma.pulseEvent.updateMany({
            where: { inboundEmailId: emailId },
            data: { briefId, ...(brief.matterId ? { matterId: brief.matterId } : {}) },
        }),
    ]);

    revalidatePath('/emails');
    revalidatePath(`/briefs/${briefId}`);
    return { success: true };
}

export async function unlinkEmail(emailId: string): Promise<{ success: boolean }> {
    await requireAuth();

    await Promise.all([
        prisma.inboundEmail.update({ where: { id: emailId }, data: { matterId: null } }),
        prisma.pulseEvent.updateMany({ where: { inboundEmailId: emailId }, data: { briefId: null, matterId: null } }),
    ]);

    revalidatePath('/emails');
    return { success: true };
}

export async function bulkLinkEmailsToBrief(
    emailIds: string[],
    briefId: string,
): Promise<{ success: boolean; linked: number; error?: string }> {
    await requireAuth();
    if (emailIds.length === 0) return { success: true, linked: 0 };

    const brief = await prisma.brief.findUnique({
        where: { id: briefId },
        select: { matterId: true, workspaceId: true, name: true },
    });
    if (!brief) return { success: false, linked: 0, error: 'Brief not found' };

    await Promise.all([
        brief.matterId
            ? prisma.inboundEmail.updateMany({ where: { id: { in: emailIds } }, data: { matterId: brief.matterId } })
            : Promise.resolve(),
        prisma.pulseEvent.updateMany({
            where: { inboundEmailId: { in: emailIds } },
            data: { briefId, ...(brief.matterId ? { matterId: brief.matterId } : {}) },
        }),
    ]);

    revalidatePath('/emails');
    revalidatePath(`/briefs/${briefId}`);
    return { success: true, linked: emailIds.length };
}

export async function quickCreateBriefAndLink(
    emailIds: string | string[],
    briefName: string,
    category: string,
): Promise<{ success: boolean; briefId?: string; error?: string }> {
    const ids = Array.isArray(emailIds) ? emailIds : [emailIds];
    const user = await requireAuth();

    const membership = await prisma.workspaceMember.findFirst({
        where: { user: { email: user.email! } },
        select: { workspaceId: true },
    });
    if (!membership) return { success: false, error: 'No workspace' };

    const { workspaceId } = membership;

    // Auto-generate brief number
    const count = await prisma.brief.count({ where: { workspaceId } });
    const briefNumber = `BRF-${String(count + 1).padStart(4, '0')}`;

    const brief = await prisma.brief.create({
        data: {
            briefNumber,
            name: briefName.trim(),
            category,
            status: 'active',
            workspaceId,
            lawyerId: user.id!,
            isLitigationDerived: false,
        },
    });

    const linkResult = await bulkLinkEmailsToBrief(ids, brief.id);
    if (!linkResult.success) return { success: false, error: linkResult.error };

    revalidatePath('/briefs');
    return { success: true, briefId: brief.id };
}

// ── Email Triage ──────────────────────────────────────────────────────────────

export interface TriageSuggestion {
    briefId: string;
    briefName: string;
    briefNumber: string;
    clientName: string | null;
    confidence: number;
    reasoning: string;
}

export interface TriageGroup {
    key: string;
    label: string;
    emailIds: string[];
    emailPreviews: { id: string; fromName: string | null; fromEmail: string; subject: string; receivedAt: Date }[];
    suggestions: TriageSuggestion[];
    suggestedNewBriefName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
    'the','and','for','are','not','all','can','was','has','its','new','see','did',
    'own','say','too','use','in','of','to','is','it','be','as','at','so','we',
    'he','by','or','on','do','if','me','my','up','an','go','no','us','am','a',
]);

function normalizeSubjectKey(subject: string): string {
    return subject
        .replace(/^(fwd?:|re:)\s*/gi, '')
        .split(/\s+[—–-]\s+/)[0]
        .replace(/\bversus\b/gi, 'v')
        .replace(/\bvs\.?\b/gi, 'v')
        .trim()
        .toLowerCase();
}

function significantWords(s: string): Set<string> {
    return new Set(
        s.split(/[\s,.()\[\]/\\]+/)
         .map(w => w.replace(/[^a-z0-9]/g, ''))
         .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    );
}

// Returns 0–1: fraction of the smaller set's words that appear in both
function wordOverlap(a: string, b: string): number {
    const wa = significantWords(a);
    const wb = significantWords(b);
    if (wa.size === 0 || wb.size === 0) return 0;
    const shared = [...wa].filter(w => wb.has(w)).length;
    return shared / Math.min(wa.size, wb.size);
}

export async function triageUnlinkedEmails(): Promise<TriageGroup[]> {
    const user = await requireAuth();

    const membership = await prisma.workspaceMember.findFirst({
        where: { user: { email: user.email! } },
        select: { workspaceId: true },
    });
    if (!membership) return [];

    const { workspaceId } = membership;

    // Fetch unlinked emails (no matterId, capped to prevent overload)
    const allEmails = await prisma.inboundEmail.findMany({
        where: { workspaceId, matterId: null },
        select: { id: true, fromEmail: true, fromName: true, subject: true, bodyPreview: true, receivedAt: true },
        orderBy: { receivedAt: 'desc' },
        take: 200,
    });

    // Filter out those linked via PulseEvent
    const pulseLinked = await prisma.pulseEvent.findMany({
        where: { inboundEmailId: { in: allEmails.map(e => e.id) }, briefId: { not: null } },
        select: { inboundEmailId: true },
    });
    const linkedIds = new Set(pulseLinked.map(p => p.inboundEmailId!));
    const unlinked = allEmails.filter(e => !linkedIds.has(e.id));

    if (unlinked.length === 0) return [];

    // Fetch brief candidates
    const briefs = await prisma.brief.findMany({
        where: { workspaceId, deletedAt: null },
        select: { id: true, briefNumber: true, name: true, category: true, client: { select: { name: true } } },
    });

    const candidates = briefs.map(b => ({
        id: b.id,
        name: b.name,
        briefNumber: b.briefNumber,
        clientName: b.client?.name ?? '',
    }));

    // ── Fuzzy subject grouping ────────────────────────────────────────────────
    // For each email, find an existing group whose normalised key has ≥50% word
    // overlap with this email's key. If found, join that group; otherwise start
    // a new one. This merges "Odumosu v Commissioner" with "Odumosu v Commissioner
    // of Police" automatically.
    const groupMap = new Map<string, typeof unlinked>();

    for (const email of unlinked) {
        const key = normalizeSubjectKey(email.subject);
        let matchedKey: string | null = null;

        for (const existingKey of groupMap.keys()) {
            if (wordOverlap(key, existingKey) >= 0.5) {
                matchedKey = existingKey;
                break;
            }
        }

        const targetKey = matchedKey ?? key;
        if (!groupMap.has(targetKey)) groupMap.set(targetKey, []);
        groupMap.get(targetKey)!.push(email);
    }

    // Cap at 30 groups to limit AI cost
    const groupEntries = Array.from(groupMap.entries()).slice(0, 30);

    const groups = await Promise.all(
        groupEntries.map(async ([key, emails]): Promise<TriageGroup> => {
            const rep = emails[0];
            const label = rep.subject.replace(/^(fwd?:|re:)\s*/gi, '').split(/\s+[—–-]\s+/)[0].trim();
            let suggestions: TriageSuggestion[] = [];

            // ── Rule 1: word-overlap against brief names (free, no AI) ──────
            if (suggestions.length === 0) {
                const best = briefs
                    .map(b => ({ b, score: wordOverlap(key, normalizeSubjectKey(b.name)) }))
                    .filter(m => m.score >= 0.4)
                    .sort((a, b) => b.score - a.score)[0];

                if (best) {
                    suggestions = [{
                        briefId: best.b.id,
                        briefName: best.b.name,
                        briefNumber: best.b.briefNumber,
                        clientName: best.b.client?.name ?? null,
                        confidence: best.score,
                        reasoning: `${Math.round(best.score * 100)}% word match with brief name`,
                    }];
                }
            }

            // ── Rule 2: AI routing as last resort ─────────────────────────────
            if (suggestions.length === 0 && candidates.length > 0) {
                try {
                    const result = await identifyBriefFromContent(
                        rep.subject,
                        rep.bodyPreview ?? '',
                        candidates,
                    );
                    if (result.briefId && result.confidence >= 0.35) {
                        const brief = briefs.find(b => b.id === result.briefId);
                        if (brief) {
                            suggestions = [{
                                briefId: brief.id,
                                briefName: brief.name,
                                briefNumber: brief.briefNumber,
                                clientName: brief.client?.name ?? null,
                                confidence: result.confidence,
                                reasoning: result.reasoning,
                            }];
                        }
                    }
                } catch {
                    // Non-fatal — show group without suggestion
                }
            }

            return {
                key,
                label,
                emailIds: emails.map(e => e.id),
                emailPreviews: emails.slice(0, 5).map(e => ({
                    id: e.id,
                    fromName: e.fromName,
                    fromEmail: e.fromEmail,
                    subject: e.subject,
                    receivedAt: e.receivedAt,
                })),
                suggestions,
                suggestedNewBriefName: label.slice(0, 80),
            };
        })
    );

    // Groups with suggestions first, then by email count
    return groups.sort((a, b) => {
        if (a.suggestions.length !== b.suggestions.length) return b.suggestions.length - a.suggestions.length;
        return b.emailIds.length - a.emailIds.length;
    });
}
