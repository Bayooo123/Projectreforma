import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from './send';

// Shared gate for every PROACTIVE WhatsApp nudge (cron/scan-triggered — not
// replies to an inbound message, which are never gated). Without this,
// each new trigger type would reimplement its own quiet-hours/rate-limit
// logic, and they'd drift out of sync with each other. Every new condition
// added to the anomaly detector, meeting scan, or brief manager should route
// its WhatsApp send through here rather than calling sendWhatsAppMessage
// directly.

const QUIET_HOURS_START = 21; // 9pm WAT
const QUIET_HOURS_END = 7;    // 7am WAT
const MAX_NUDGES_PER_DAY = 5;
const LAGOS_UTC_OFFSET_HOURS = 1; // WAT = UTC+1 year-round, no DST

function lagosNow(): Date {
    return new Date(Date.now() + LAGOS_UTC_OFFSET_HOURS * 3600_000);
}

export function isQuietHours(): boolean {
    const hour = lagosNow().getUTCHours();
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

function startOfTodayLagos(): Date {
    const now = lagosNow();
    const startOfDayUTCClock = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return new Date(startOfDayUTCClock - LAGOS_UTC_OFFSET_HOURS * 3600_000);
}

async function hasReachedDailyCap(userId: string): Promise<boolean> {
    const count = await prisma.workspaceActivityLog.count({
        where: { userId, resource: 'WHATSAPP_NUDGE', createdAt: { gte: startOfTodayLagos() } },
    });
    return count >= MAX_NUDGES_PER_DAY;
}

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
        if (await hasReachedDailyCap(params.userId)) return false;
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
