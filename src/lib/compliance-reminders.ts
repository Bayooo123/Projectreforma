import { prisma } from '@/lib/prisma';
import { createNotification, type Priority, type RecipientType } from '@/lib/notifications';

const DAY_MS = 24 * 60 * 60 * 1000;

// Statuses that mean the task is done — uploadEvidence writes 'concluded',
// older rows use 'complied'.
const CLOSED_STATUSES = ['concluded', 'complied', 'Concluded', 'Complied'];

const REMINDER_DAYS = new Set([7, 3, 1, 0]);

// Members who own compliance in a firm. Matched case-insensitively against
// WorkspaceMember.role and .designation; falls back to the workspace owner.
const RECIPIENT_ROLES = [
    'practice manager',
    'head of chamber',
    'head of chambers',
    'partner',
    'principal partner',
    'managing partner',
];

export type ReminderStage =
    | { kind: 'upcoming'; daysUntilDue: number }
    | { kind: 'overdue'; daysOverdue: number };

/**
 * Decides whether a task with this due date should be reminded about today.
 * Upcoming: 7, 3, 1 and 0 days out. Overdue: the day after, then weekly —
 * a daily critical alert for the same missed filing just gets ignored.
 */
export function reminderStageFor(dueDate: Date, now: Date): ReminderStage | null {
    const dueDay = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const diff = Math.round((dueDay - today) / DAY_MS);

    if (diff >= 0) return REMINDER_DAYS.has(diff) ? { kind: 'upcoming', daysUntilDue: diff } : null;

    const daysOverdue = -diff;
    return daysOverdue === 1 || daysOverdue % 7 === 0 ? { kind: 'overdue', daysOverdue } : null;
}

export async function getFirmLeads(workspaceId: string): Promise<{ userId: string; role: string }[]> {
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, status: 'active' },
        select: { userId: true, role: true, designation: true },
    });
    const matched = members.filter(m =>
        RECIPIENT_ROLES.includes(m.role.toLowerCase()) ||
        (m.designation && RECIPIENT_ROLES.includes(m.designation.toLowerCase()))
    );
    if (matched.length > 0) return matched;

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
    return workspace ? [{ userId: workspace.ownerId, role: 'owner' }] : [];
}

export async function runComplianceReminders(now = new Date()) {
    // Anything due within the next week, or already overdue.
    const tasks = await prisma.complianceTask.findMany({
        where: {
            status: { notIn: CLOSED_STATUSES },
            dueDate: { not: null, lte: new Date(now.getTime() + 8 * DAY_MS) },
        },
        include: { obligation: { select: { actionRequired: true, regulatoryBody: true, tier: true } } },
    });

    const recipientCache = new Map<string, { userId: string; role: string }[]>();
    let notified = 0;
    let skipped = 0;

    for (const task of tasks) {
        const stage = reminderStageFor(task.dueDate!, now);
        if (!stage) continue;

        // Guards against a retried or manually re-triggered run sending twice.
        const alreadySent = await prisma.notification.findFirst({
            where: {
                relatedComplianceTaskId: task.id,
                type: 'compliance_reminder',
                createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
            },
            select: { id: true },
        });
        if (alreadySent) {
            skipped++;
            continue;
        }

        if (!recipientCache.has(task.workspaceId)) {
            recipientCache.set(task.workspaceId, await getFirmLeads(task.workspaceId));
        }

        const { actionRequired, regulatoryBody } = task.obligation;
        const dueLabel = task.dueDate!.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        let title: string;
        let message: string;
        let priority: Priority;

        if (stage.kind === 'upcoming') {
            const when = stage.daysUntilDue === 0 ? 'today' : stage.daysUntilDue === 1 ? 'tomorrow' : `in ${stage.daysUntilDue} days`;
            title = `Compliance due ${when}: ${actionRequired}`;
            message = `${actionRequired} (${regulatoryBody}) is due ${when}, on ${dueLabel}. Upload evidence once it is filed.`;
            priority = stage.daysUntilDue <= 1 ? 'critical' : 'high';
        } else {
            title = `Compliance overdue: ${actionRequired}`;
            message = `${actionRequired} (${regulatoryBody}) was due on ${dueLabel} and is ${stage.daysOverdue} day${stage.daysOverdue === 1 ? '' : 's'} overdue.`;
            priority = 'critical';
        }

        for (const r of recipientCache.get(task.workspaceId)!) {
            await createNotification({
                title,
                message,
                recipientId: r.userId,
                recipientType: (r.role === 'owner' ? 'partner' : 'staff') as RecipientType,
                type: 'compliance_reminder',
                priority,
                relatedComplianceTaskId: task.id,
            });
        }
        notified++;
    }

    return { checked: tasks.length, notified, skipped };
}
