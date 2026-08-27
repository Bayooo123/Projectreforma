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
