'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

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
        take: 200,
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
    const user = await requireAuth();

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
        // Log to brief activity feed
        prisma.briefActivityLog.create({
            data: {
                briefId,
                activityType: 'email_linked',
                description: `Email linked: ${email.subject ?? '(no subject)'}`,
                performedBy: user.id!,
            },
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
    const user = await requireAuth();
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
        prisma.briefActivityLog.createMany({
            data: emailIds.map(emailId => ({
                briefId,
                activityType: 'email_linked',
                description: `Email bulk-linked to brief`,
                performedBy: user.id!,
            })),
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
