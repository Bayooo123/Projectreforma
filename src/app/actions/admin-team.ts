'use server';

import { prisma } from '@/lib/prisma';
import { requirePlatformAdmin } from '@/lib/auth-utils';
import { mailService } from '@/lib/services/mail/mail';
import { generateOpaqueToken, hashToken } from '@/lib/services/auth/tokens';
import { config } from '@/lib/config';
import { revalidatePath } from 'next/cache';

export async function getPlatformTeam() {
    await requirePlatformAdmin();

    const [admins, pendingInvites] = await Promise.all([
        prisma.user.findMany({
            where: { isPlatformAdmin: true },
            select: { id: true, name: true, email: true, createdAt: true },
            orderBy: { name: 'asc' },
        }),
        prisma.adminInvite.findMany({
            where: { status: 'pending', expiresAt: { gt: new Date() } },
            select: { id: true, email: true, createdAt: true, expiresAt: true, invitedBy: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return { admins, pendingInvites };
}

export async function invitePlatformAdmin(email: string) {
    const inviter = await requirePlatformAdmin();

    const normalised = email.toLowerCase().trim();
    if (!normalised) return { success: false, error: 'Email is required.' };

    const existing = await prisma.user.findUnique({ where: { email: normalised }, select: { isPlatformAdmin: true } });
    if (existing?.isPlatformAdmin) return { success: false, error: 'This person is already a platform admin.' };

    // Cancel any existing pending invite for this email
    await prisma.adminInvite.updateMany({
        where: { email: normalised, status: 'pending' },
        data: { status: 'revoked' },
    });

    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);

    await prisma.adminInvite.create({
        data: {
            email: normalised,
            invitedById: inviter.id!,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    });

    const acceptUrl = `${config.NEXT_PUBLIC_APP_URL}/admin/join?token=${token}`;

    await mailService.send({
        to: normalised,
        subject: 'You have been invited to Reforma HQ',
        from: config.MAIL_FROM,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
  <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
    <tr><td style="background:#064e3b;border-radius:8px 8px 0 0;padding:24px 40px;text-align:center;">
      <span style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#fff;">Re<span style="color:#6EE7B7;">forma</span></span>
      <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">HQ Administration</div>
    </td></tr>
    <tr><td style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:36px 40px;">
      <h1 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 16px;">You've been invited to Reforma HQ</h1>
      <p style="color:#4B5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
        ${inviter.name || inviter.email} has invited you to join the Reforma platform administration team.
        As a platform admin you will have access to workspace management, the operations pipeline, and internal tools.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${acceptUrl}" style="background:#064e3b;color:#fff;font-size:15px;font-weight:600;padding:13px 32px;border-radius:8px;text-decoration:none;display:inline-block;">Accept Invitation →</a>
      </div>
      <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:0;">
        This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.
      </p>
    </td></tr>
  </table>
  </td></tr></table>
</body>
</html>`,
    });

    revalidatePath('/admin/team');
    return { success: true };
}

export async function revokeAdminInvite(inviteId: string) {
    await requirePlatformAdmin();
    await prisma.adminInvite.update({ where: { id: inviteId }, data: { status: 'revoked' } });
    revalidatePath('/admin/team');
    return { success: true };
}

export async function removePlatformAdmin(userId: string) {
    const actor = await requirePlatformAdmin();
    if (actor.id === userId) return { success: false, error: "You can't remove yourself." };
    await prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: false } });
    revalidatePath('/admin/team');
    return { success: true };
}
