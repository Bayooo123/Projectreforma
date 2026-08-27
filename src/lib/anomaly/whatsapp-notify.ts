import { prisma } from '@/lib/prisma';
import { sendGatedWhatsAppNudge } from '@/lib/agents/whatsapp/notify-gate';
import type { AnomalyType } from './detector';

// Only these types get a WhatsApp push — the rest (SPARSE_BRIEF,
// PLACEHOLDER_CLIENT, UNSCHEDULED_MATTER, MISSING_EXPENSE_PERIOD) are
// administrative housekeeping rather than something urgent enough to
// interrupt someone's phone for, and stay in-app-only (the Pulse board).
// Also skips 'low'/'medium' severity for everything except
// MISSING_COURT_OUTCOME, which is always created at 'critical' already.
const NOTIFIABLE_TYPES: ReadonlySet<AnomalyType> = new Set([
    'MISSING_COURT_OUTCOME',
    'FILING_DEADLINE_RISK',
    'OVERDUE_MILESTONE',
    'INVOICE_OVERDUE',
    'TASK_OVERDUE',
]);

interface NotifiableAnomaly {
    type: AnomalyType;
    severity: string;
    title: string;
    question: string;
    resourceId: string;
    resourceName: string;
    responsibleUserId?: string;
}

// Called from runAnomalyScan with only the anomalies that were newly created
// this run (not ones already open from a prior scan) — dedup already handled
// by the caller, so every call here is a genuinely new condition worth a push.
export async function notifyForNewAnomalies(workspaceId: string, newAnomalies: NotifiableAnomaly[]): Promise<void> {
    for (const a of newAnomalies) {
        if (!NOTIFIABLE_TYPES.has(a.type)) continue;
        if (a.severity !== 'critical' && a.severity !== 'high') continue;
        if (!a.responsibleUserId) continue;

        const user = await prisma.user.findUnique({ where: { id: a.responsibleUserId }, select: { phone: true } });
        if (!user?.phone) continue;

        await sendGatedWhatsAppNudge({
            workspaceId,
            userId: a.responsibleUserId,
            phone: user.phone.replace(/\D/g, ''),
            message: `${a.title}\n${a.question}\n\nReply here, or open Reforma for the full detail.`,
            triggerType: `anomaly_${a.type.toLowerCase()}`,
            resourceId: a.resourceId,
            resourceName: a.resourceName,
            urgent: a.severity === 'critical',
        }).catch(err => console.error(`[AnomalyNotify] Nudge failed for ${a.type} ${a.resourceId}:`, err));
    }
}

const ESCALATION_THRESHOLD_DAYS = 3;

interface StaleAnomaly {
    id: string;
    type: string;
    severity: string;
    title: string;
    question: string;
    resourceId: string | null;
    resourceName: string | null;
    detectedAt: Date;
}

// "Unanswered" isn't tracked as a reply thread — WhatsApp nudges aren't
// threaded to a specific inbound reply in this system. Instead this uses
// the signal the anomaly system already has for free: an anomaly only
// stays open because its underlying condition is still true (the outcome
// still isn't logged, the invoice still isn't paid, the task still isn't
// done) — runAnomalyScan auto-resolves it the moment that stops being the
// case. So "still open N days after it was first raised" is a real,
// already-computed proxy for "nobody's dealt with this yet."
//
// Escalates once per anomaly (checked via a WorkspaceActivityLog row from
// a prior run), not every day it stays open — a single heads-up to the
// managing partner, not a repeating alarm.
export async function escalateStaleAnomalies(workspaceId: string): Promise<void> {
    const threshold = new Date(Date.now() - ESCALATION_THRESHOLD_DAYS * 86_400_000);

    const staleAnomalies = await prisma.workspaceAnomaly.findMany({
        where: {
            workspaceId,
            status: { in: ['open', 'acknowledged'] },
            type: { in: [...NOTIFIABLE_TYPES] },
            detectedAt: { lt: threshold },
        },
        select: { id: true, type: true, severity: true, title: true, question: true, resourceId: true, resourceName: true, detectedAt: true },
    });
    if (staleAnomalies.length === 0) return;

    const alreadyEscalated = await prisma.workspaceActivityLog.findMany({
        where: { workspaceId, resource: 'WHATSAPP_NUDGE', action: 'anomaly_escalation', resourceId: { in: staleAnomalies.map(a => a.id) } },
        select: { resourceId: true },
    });
    const escalatedIds = new Set(alreadyEscalated.map(l => l.resourceId));

    const toEscalate = staleAnomalies.filter((a: StaleAnomaly) => !escalatedIds.has(a.id));
    if (toEscalate.length === 0) return;

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
    if (!workspace) return;
    const owner = await prisma.user.findUnique({ where: { id: workspace.ownerId }, select: { phone: true } });
    if (!owner?.phone) return;

    for (const a of toEscalate) {
        const daysOpen = Math.floor((Date.now() - a.detectedAt.getTime()) / 86_400_000);
        await sendGatedWhatsAppNudge({
            workspaceId,
            userId: workspace.ownerId,
            phone: owner.phone.replace(/\D/g, ''),
            message: `Escalation: ${a.title}\nOpen for ${daysOpen} days with no resolution — ${a.question}\n\nOpen Reforma for the full detail.`,
            triggerType: 'anomaly_escalation',
            resourceId: a.id,
            resourceName: a.resourceName ?? undefined,
            urgent: a.severity === 'critical',
        }).catch(err => console.error(`[AnomalyNotify] Escalation failed for ${a.type} ${a.id}:`, err));
    }
}
