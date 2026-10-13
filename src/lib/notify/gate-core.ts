import { prisma } from '@/lib/prisma';

// Shared quiet-hours/daily-cap primitives for every PROACTIVE notification
// channel (WhatsApp nudges, email nudges, and whatever's next). Extracted
// out of the WhatsApp-only gate so a second channel doesn't have to
// redefine "what counts as quiet hours" and drift out of sync with it —
// that duplication is exactly what the WhatsApp gate's own comment warns
// against, just one level up (per-channel instead of per-trigger-type).

const QUIET_HOURS_START = 21; // 9pm WAT
const QUIET_HOURS_END = 7;    // 7am WAT
const LAGOS_UTC_OFFSET_HOURS = 1; // WAT = UTC+1 year-round, no DST

export function lagosNow(): Date {
    return new Date(Date.now() + LAGOS_UTC_OFFSET_HOURS * 3600_000);
}

export function isQuietHours(): boolean {
    const hour = lagosNow().getUTCHours();
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

export function startOfTodayLagos(): Date {
    const now = lagosNow();
    const startOfDayUTCClock = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return new Date(startOfDayUTCClock - LAGOS_UTC_OFFSET_HOURS * 3600_000);
}

/** Counts logged nudges for a given resource (e.g. 'WHATSAPP_NUDGE', 'EMAIL_NUDGE') since Lagos midnight. */
export async function hasReachedDailyCap(userId: string, resource: string, max: number): Promise<boolean> {
    const count = await prisma.workspaceActivityLog.count({
        where: { userId, resource, createdAt: { gte: startOfTodayLagos() } },
    });
    return count >= max;
}
