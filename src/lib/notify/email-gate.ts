import { prisma } from '@/lib/prisma';
import { mailService } from '@/lib/services/mail/mail';
import { isQuietHours, hasReachedDailyCap } from './gate-core';

// Email counterpart to src/lib/agents/whatsapp/notify-gate.ts — same
// quiet-hours/daily-cap shape, built on the same shared primitives, so a
// new proactive trigger (First Draft readiness, an anomaly, a reminder)
// has one obvious place to route an email through instead of each one
// deciding on its own whether and how to send it.

const MAX_NUDGES_PER_DAY = 8; // higher than WhatsApp's 5 — email is asynchronous, not an interruption

interface GatedEmailNudgeParams {
    workspaceId: string;
    userId: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    /** Free-form label for what triggered this — recorded for the daily-cap count and for later debugging, not used for logic. */
    triggerType: string;
    resourceId?: string;
    resourceName?: string;
    /** Bypasses quiet hours and the daily cap — reserve for genuinely time-critical escalations, not every proactive email. */
    urgent?: boolean;
}

/** Returns true if the email was actually sent, false if it was held back by the gate. */
export async function sendGatedEmailNudge(params: GatedEmailNudgeParams): Promise<boolean> {
    if (!params.urgent) {
        if (isQuietHours()) return false;
        if (await hasReachedDailyCap(params.userId, 'EMAIL_NUDGE', MAX_NUDGES_PER_DAY)) return false;
    }

    const result = await mailService.send({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
    });
    if (!result.success) return false;

    await prisma.workspaceActivityLog.create({
        data: {
            workspaceId: params.workspaceId,
            userId: params.userId,
            resource: 'EMAIL_NUDGE',
            action: params.triggerType,
            resourceId: params.resourceId,
            resourceName: params.resourceName,
        },
    }).catch(err => console.error('[NotifyGate] Failed to record email nudge log:', err));

    return true;
}
