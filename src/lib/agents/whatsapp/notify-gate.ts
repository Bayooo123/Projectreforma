import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from './send';
import { lagosNow, isQuietHours, hasReachedDailyCap } from '@/lib/notify/gate-core';

// Shared gate for every PROACTIVE WhatsApp nudge (cron/scan-triggered — not
// replies to an inbound message, which are never gated). Without this,
// each new trigger type would reimplement its own quiet-hours/rate-limit
// logic, and they'd drift out of sync with each other. Every new condition
// added to the anomaly detector, meeting scan, or brief manager should route
// its WhatsApp send through here rather than calling sendWhatsAppMessage
// directly.
//
// Quiet-hours/daily-cap primitives live in @/lib/notify/gate-core, shared
// with the email nudge gate — only the resource name, cap, and send call
// are WhatsApp-specific here.

export { lagosNow };

const MAX_NUDGES_PER_DAY = 5;

interface GatedNudgeParams {
    workspaceId: string;
    userId: string;
    phone: string;
    message: string;
    /** Free-form label for what triggered this — recorded for the daily-cap count and for later debugging, not used for logic. */
    triggerType: string;
    resourceId?: string;
    resourceName?: string;
    /** Bypasses quiet hours and the daily cap — reserve for genuinely time-critical escalations (e.g. an overdue court outcome), not every high-priority nudge. */
    urgent?: boolean;
}

/** Returns true if the message was actually sent, false if it was held back by the gate. */
export async function sendGatedWhatsAppNudge(params: GatedNudgeParams): Promise<boolean> {
    if (!params.urgent) {
        if (isQuietHours()) return false;
        if (await hasReachedDailyCap(params.userId, 'WHATSAPP_NUDGE', MAX_NUDGES_PER_DAY)) return false;
    }

    await sendWhatsAppMessage(params.phone, params.message);

    await prisma.workspaceActivityLog.create({
        data: {
            workspaceId: params.workspaceId,
            userId: params.userId,
            resource: 'WHATSAPP_NUDGE',
            action: params.triggerType,
            resourceId: params.resourceId,
            resourceName: params.resourceName,
        },
    }).catch(err => console.error('[NotifyGate] Failed to record nudge log:', err));

    return true;
}
