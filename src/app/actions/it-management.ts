'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { mailService } from '@/lib/services/mail/mail';
import { getGuestWelcomeEmail } from '@/lib/services/mail/templates';
import { createPasswordResetToken } from '@/lib/services/auth/tokens';
import { config } from '@/lib/config';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id, status: 'active' },
        select: { workspaceId: true, role: true, userId: true },
    });
    if (!member) throw new Error('Not a workspace member');

    // Workspace owners always have admin access regardless of their member role label
    const workspace = await prisma.workspace.findUnique({
        where: { id: member.workspaceId },
        select: { ownerId: true },
    });
    const isAdmin = ['admin', 'owner'].includes(member.role) || workspace?.ownerId === session.user.id;
    if (!isAdmin) throw new Error('Admin access required');

    return { userId: session.user.id, workspaceId: member.workspaceId, role: member.role };
}

// ─── Guest Accounts ───────────────────────────────────────────────────────────

export async function getGuestMembers() {
    const { workspaceId } = await requireAdmin();

    return prisma.workspaceMember.findMany({
        where: { workspaceId, isGuest: true },
        include: {
            user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
            briefGrants: {
                include: { brief: { select: { id: true, name: true, briefNumber: true } } },
            },
        },
        orderBy: { joinedAt: 'desc' },
    });
}

export async function inviteGuestMember(data: {
    email: string;
    name: string;
    designation?: string;
    expiresAt?: string;
    canDownload: boolean;
}) {
    const { workspaceId, userId } = await requireAdmin();

    // Find or check user exists
    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
        // Create a placeholder user; they'll set their password on first login
        const { randomBytes, createHash } = await import('crypto');
        const tempPassword = randomBytes(16).toString('hex');
        const bcrypt = await import('bcryptjs');
        const hashed = await bcrypt.hash(tempPassword, 12);

        user = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: hashed,
            },
        });
    }

    // Check not already a member
    const existing = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (existing) throw new Error('User is already a member of this workspace');

    const member = await prisma.workspaceMember.create({
        data: {
            workspaceId,
            userId: user.id,
            role: 'viewer',
            isGuest: true,
            canDownload: data.canDownload,
            designation: data.designation || 'Guest',
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            status: 'active',
        },
    });

    await prisma.securityAuditLog.create({
        data: {
            userId,
            event: 'guest_invited',
            description: `Guest account created for ${data.email}`,
            metadata: { guestMemberId: member.id, targetEmail: data.email },
        },
    });

    // Send welcome email with set-password link (24h TTL)
    await _sendGuestEmail(user.id, data.name, data.designation || 'Guest', member.workspaceId);

    revalidatePath('/management/it');
    return { success: true };
}

async function _sendGuestEmail(userId: string, name: string, designation: string, workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!workspace || !user) return;

    const token = await createPasswordResetToken(userId, 24 * 60 * 60 * 1000); // 24 hours
    const setPasswordUrl = `${config.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

    await mailService.send({
        to: user.email,
        subject: `You've been added to ${workspace.name} on Reforma`,
        html: getGuestWelcomeEmail(name, workspace.name, designation, setPasswordUrl),
    });
}

export async function sendGuestInviteEmail(memberId: string) {
    const { workspaceId } = await requireAdmin();

    const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!member) throw new Error('Member not found');

    await _sendGuestEmail(
        member.userId,
        member.user.name || member.user.email,
        member.designation || 'Guest',
        workspaceId,
    );

    return { success: true };
}

export async function updateGuestMember(memberId: string, data: {
    canDownload?: boolean;
    expiresAt?: string | null;
    designation?: string;
    status?: string;
}) {
    const { workspaceId, userId } = await requireAdmin();

    const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId, isGuest: true },
    });
    if (!member) throw new Error('Guest member not found');

    await prisma.workspaceMember.update({
        where: { id: memberId },
        data: {
            canDownload: data.canDownload,
            expiresAt: data.expiresAt === null ? null : data.expiresAt ? new Date(data.expiresAt) : undefined,
            designation: data.designation,
            status: data.status,
        },
    });

    await prisma.securityAuditLog.create({
        data: {
            userId,
            event: 'guest_updated',
            description: `Guest account ${memberId} updated`,
            metadata: { memberId, changes: data },
        },
    });

    revalidatePath('/management/it');
    return { success: true };
}

export async function revokeGuestMember(memberId: string) {
    const { workspaceId, userId } = await requireAdmin();

    const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId, isGuest: true },
        include: { user: { select: { email: true } } },
    });
    if (!member) throw new Error('Guest member not found');

    await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { status: 'revoked' },
    });

    await prisma.securityAuditLog.create({
        data: {
            userId,
            event: 'guest_revoked',
            description: `Guest access revoked for ${member.user.email}`,
            metadata: { memberId },
        },
    });

    revalidatePath('/management/it');
    return { success: true };
}

export async function grantBriefAccess(memberId: string, briefId: string) {
    const { workspaceId, userId } = await requireAdmin();

    const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
    });
    if (!member) throw new Error('Member not found');

    await prisma.briefAccessGrant.upsert({
        where: { memberId_briefId: { memberId, briefId } },
        create: { memberId, briefId, grantedBy: userId },
        update: { grantedBy: userId },
    });

    revalidatePath('/management/it');
    return { success: true };
}

export async function revokeBriefAccess(memberId: string, briefId: string) {
    const { workspaceId } = await requireAdmin();

    await prisma.briefAccessGrant.deleteMany({
        where: {
            memberId,
            briefId,
            member: { workspaceId },
        },
    });

    revalidatePath('/management/it');
    return { success: true };
}

// ─── Role & Permission Management ─────────────────────────────────────────────

export async function getWorkspaceMembers() {
    const { workspaceId } = await requireAdmin();

    return prisma.workspaceMember.findMany({
        where: { workspaceId, status: 'active' },
        include: {
            user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
        },
        orderBy: { joinedAt: 'asc' },
    });
}

export async function updateMemberRole(memberId: string, role: string) {
    const { workspaceId, userId } = await requireAdmin();

    const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { user: { select: { email: true } } },
    });
    if (!member) throw new Error('Member not found');

    const oldRole = member.role;
    await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { role },
    });

    await prisma.securityAuditLog.create({
        data: {
            userId,
            event: 'role_changed',
            description: `Role changed for ${member.user.email}: ${oldRole} → ${role}`,
            metadata: { memberId, oldRole, newRole: role },
        },
    });

    revalidatePath('/management/it');
    return { success: true };
}

export async function updateMemberDownloadPermission(memberId: string, canDownload: boolean) {
    const { workspaceId, userId } = await requireAdmin();

    const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { user: { select: { email: true } } },
    });
    if (!member) throw new Error('Member not found');

    await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { canDownload },
    });

    await prisma.securityAuditLog.create({
        data: {
            userId,
            event: 'permission_changed',
            description: `Download permission ${canDownload ? 'granted' : 'revoked'} for ${member.user.email}`,
            metadata: { memberId, canDownload },
        },
    });

    revalidatePath('/management/it');
    return { success: true };
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function getAuditLogs(limit = 100, eventFilter?: string) {
    const { workspaceId } = await requireAdmin();

    // Get all user IDs in this workspace
    const memberUserIds = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { userId: true },
    });
    const userIds = memberUserIds.map(m => m.userId);

    return prisma.securityAuditLog.findMany({
        where: {
            userId: { in: userIds },
            ...(eventFilter ? { event: { contains: eventFilter, mode: 'insensitive' as const } } : {}),
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

// ─── Session Control ──────────────────────────────────────────────────────────

export async function getActiveSessions() {
    const { workspaceId } = await requireAdmin();

    const memberUserIds = await prisma.workspaceMember.findMany({
        where: { workspaceId, status: 'active' },
        select: { userId: true },
    });
    const userIds = memberUserIds.map(m => m.userId);

    return prisma.userSession.findMany({
        where: {
            userId: { in: userIds },
            revokedAt: null,
            expiresAt: { gt: new Date() },
        },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function forceLogoutUser(targetUserId: string) {
    const { workspaceId, userId } = await requireAdmin();

    const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: targetUserId },
        include: { user: { select: { email: true } } },
    });
    if (!member) throw new Error('User not in this workspace');

    // Increment sessionVersion — this invalidates all existing JWTs immediately
    // on the user's next page load (jwt callback compares token version vs DB version)
    await prisma.user.update({
        where: { id: targetUserId },
        data: { sessionVersion: { increment: 1 } },
    });

    // Also mark all active UserSession records as revoked (for UI accuracy)
    await prisma.userSession.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    await prisma.securityAuditLog.create({
        data: {
            userId,
            event: 'force_logout',
            description: `All sessions terminated for ${member.user.email}`,
            metadata: { targetUserId },
        },
    });

    revalidatePath('/management/it');
    return { success: true };
}

// ─── Workspace Activity Log ────────────────────────────────────────────────────

export async function getActivityLogs(page = 1, limit = 50) {
    const { workspaceId } = await requireAdmin();

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        prisma.workspaceActivityLog.findMany({
            where: { workspaceId },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.workspaceActivityLog.count({ where: { workspaceId } }),
    ]);

    return { logs, total, page, limit };
}

// ─── Briefs list for access grant selector ────────────────────────────────────

export async function getWorkspaceBriefs() {
    const { workspaceId } = await requireAdmin();

    return prisma.brief.findMany({
        where: { workspaceId, deletedAt: null },
        select: { id: true, name: true, briefNumber: true, customTitle: true, customBriefNumber: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
}

// ─── canDelete Permission Toggle ──────────────────────────────────────────────

export async function toggleMemberCanDelete(memberId: string, canDelete: boolean) {
    const { workspaceId, userId } = await requireAdmin();

    const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { user: { select: { email: true } } },
    });
    if (!member) throw new Error('Member not found');

    await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { canDelete },
    });

    await prisma.securityAuditLog.create({
        data: {
            userId,
            event: 'permission_changed',
            description: `Delete permission ${canDelete ? 'granted to' : 'revoked from'} ${member.user.email}`,
            metadata: { memberId, canDelete },
        },
    });

    revalidatePath('/management/it');
    return { success: true };
}

// ─── Deleted Records (Restore) ────────────────────────────────────────────────

export async function getDeletedRecords() {
    const { workspaceId } = await requireAdmin();

    const [briefs, clients, matters] = await Promise.all([
        prisma.brief.findMany({
            where: { workspaceId, deletedAt: { not: null } },
            select: { id: true, name: true, briefNumber: true, customTitle: true, deletedAt: true },
            orderBy: { deletedAt: 'desc' },
        }),
        prisma.client.findMany({
            where: { workspaceId, deletedAt: { not: null } },
            select: { id: true, name: true, email: true, company: true, deletedAt: true },
            orderBy: { deletedAt: 'desc' },
        }),
        prisma.matter.findMany({
            where: { workspaceId, deletedAt: { not: null } },
            select: { id: true, name: true, caseNumber: true, deletedAt: true },
            orderBy: { deletedAt: 'desc' },
        }),
    ]);

    return { briefs, clients, matters };
}

export async function restoreRecord(type: 'brief' | 'client' | 'matter', id: string) {
    const { workspaceId } = await requireAdmin();

    if (type === 'brief') {
        const record = await prisma.brief.findFirst({ where: { id, workspaceId } });
        if (!record) throw new Error('Record not found');
        await prisma.brief.update({ where: { id }, data: { deletedAt: null } });
        revalidatePath('/briefs');
    } else if (type === 'client') {
        const record = await prisma.client.findFirst({ where: { id, workspaceId } });
        if (!record) throw new Error('Record not found');
        await prisma.client.update({ where: { id }, data: { deletedAt: null } });
        revalidatePath('/management/clients');
    } else if (type === 'matter') {
        const record = await prisma.matter.findFirst({ where: { id, workspaceId } });
        if (!record) throw new Error('Record not found');
        await prisma.matter.update({ where: { id }, data: { deletedAt: null } });
        revalidatePath('/calendar');
    }

    revalidatePath('/management/it');
    return { success: true };
}

// ─── Brief Attribution Management ────────────────────────────────────────────

export async function getBriefAttributions() {
    const { workspaceId } = await requireAdmin();

    const [briefs, members] = await Promise.all([
        prisma.brief.findMany({
            where: { workspaceId, deletedAt: null, status: 'active' },
            select: {
                id: true, name: true, customTitle: true,
                briefNumber: true, customBriefNumber: true, category: true,
                lawyerInChargeId: true,
                lawyerInCharge: { select: { id: true, name: true, email: true } },
                briefLawyers: {
                    select: { lawyerId: true, lawyer: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        }),
        prisma.workspaceMember.findMany({
            where: { workspaceId, status: 'active', isGuest: false },
            select: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { joinedAt: 'asc' },
        }),
    ]);

    return {
        briefs: briefs.map(b => ({
            id: b.id,
            name: b.customTitle || b.name,
            ref: b.customBriefNumber || b.briefNumber,
            category: b.category,
            primaryId: b.lawyerInChargeId ?? null,
            primaryName: b.lawyerInCharge?.name ?? b.lawyerInCharge?.email ?? null,
            secondaries: b.briefLawyers.map(bl => ({
                lawyerId: bl.lawyerId,
                name: bl.lawyer.name ?? bl.lawyer.email,
            })),
        })),
        members: members.map(m => ({
            id: m.user.id,
            name: m.user.name ?? m.user.email,
            email: m.user.email,
        })),
    };
}

export async function updateBriefAttribution(
    briefId: string,
    data: { primaryId: string | null; secondary1Id: string | null; secondary2Id: string | null },
) {
    const { workspaceId } = await requireAdmin();

    const brief = await prisma.brief.findFirst({
        where: { id: briefId, workspaceId },
        select: { id: true, matterId: true },
    });
    if (!brief) throw new Error('Brief not found');

    await prisma.brief.update({
        where: { id: briefId },
        data: { lawyerInChargeId: data.primaryId ?? null },
    });

    if (brief.matterId && data.primaryId) {
        await prisma.matter.update({
            where: { id: brief.matterId },
            data: { lawyerInChargeId: data.primaryId },
        });
    }

    await prisma.briefLawyer.deleteMany({ where: { briefId } });

    const secondaries = [data.secondary1Id, data.secondary2Id].filter((id): id is string => !!id);
    for (const lawyerId of secondaries) {
        await prisma.briefLawyer.create({ data: { briefId, lawyerId, role: 'assisting' } });
        if (brief.matterId) {
            await prisma.matterLawyer.upsert({
                where: { matterId_lawyerId: { matterId: brief.matterId, lawyerId } },
                create: { matterId: brief.matterId, lawyerId, role: 'assisting' },
                update: {},
            });
        }
    }

    revalidatePath('/pulse');
    revalidatePath('/management/it');
    return { success: true };
}
