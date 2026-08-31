import { prisma } from '@/lib/prisma';
import { sendGatedWhatsAppNudge } from './notify-gate';

// Shares a brief update with the rest of the firm over WhatsApp once someone
// actually answers a check-in question — without this, an update only ever
// reached whoever happened to open Reforma, and teammates had no way to know
// a colleague's brief had just moved. Reuses the same gate every other
// proactive push goes through (quiet hours, daily cap per recipient), rather
// than a broadcast bypassing it — a status update is not urgent enough to
// justify a 3am WhatsApp message.

export async function broadcastToWorkspace(
    workspaceId: string,
    message: string,
    opts: { excludeUserId?: string; triggerType: string; resourceId?: string; resourceName?: string },
): Promise<void> {
    const members = await prisma.workspaceMember.findMany({
        where: {
            workspaceId,
            status: 'active',
            ...(opts.excludeUserId ? { userId: { not: opts.excludeUserId } } : {}),
        },
        select: { userId: true, user: { select: { phone: true } } },
    });

    await Promise.all(
        members
            .filter((m): m is typeof m & { user: { phone: string } } => !!m.user.phone)
            .map(m =>
                sendGatedWhatsAppNudge({
                    workspaceId,
                    userId: m.userId,
                    phone: m.user.phone.replace(/\D/g, ''),
                    message,
                    triggerType: opts.triggerType,
                    resourceId: opts.resourceId,
                    resourceName: opts.resourceName,
                }).catch(err => console.error(`[Broadcast] Failed to notify ${m.userId}:`, err))
            )
    );
}
