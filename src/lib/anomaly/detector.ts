import { prisma } from '@/lib/prisma';

export type AnomalyType =
    | 'SPARSE_BRIEF'
    | 'PLACEHOLDER_CLIENT'
    | 'MISSING_COURT_OUTCOME'
    | 'MISSING_EXPENSE_PERIOD'
    | 'UNSCHEDULED_MATTER'
    | 'FILING_DEADLINE_RISK'
    | 'OVERDUE_MILESTONE';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

interface DetectedAnomaly {
    type: AnomalyType;
    severity: AnomalySeverity;
    title: string;
    question: string;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    context?: Record<string, any>;
}

// Returns months where the firm was active but no expenses were recorded
async function findExpenseGaps(workspaceId: string): Promise<{ month: string; year: number; monthNum: number; hearingCount: number }[]> {
    const now = new Date();
    const gaps = [];

    // Check last 3 months
    for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

        const [expenseCount, hearingCount] = await Promise.all([
            prisma.expense.count({ where: { workspaceId, date: { gte: start, lte: end } } }),
            prisma.calendarEntry.count({ where: { matter: { workspaceId }, date: { gte: start, lte: end } } }),
        ]);

        // Flag if there were court hearings but zero expenses — clearly active but unrecorded
        if (expenseCount === 0 && hearingCount > 0) {
            gaps.push({
                month: start.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
                year: d.getFullYear(),
                monthNum: d.getMonth() + 1,
                hearingCount,
            });
        }
    }
    return gaps;
}

export async function detectAnomalies(workspaceId: string): Promise<DetectedAnomaly[]> {
    const detected: DetectedAnomaly[] = [];
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);

    // Pull existing open/acknowledged anomalies to avoid duplicates
    const existing = await prisma.workspaceAnomaly.findMany({
        where: { workspaceId, status: { in: ['open', 'acknowledged'] } },
        select: { type: true, resourceId: true },
    });
    const existingSet = new Set(existing.map(e => `${e.type}::${e.resourceId}`));
    const isNew = (type: AnomalyType, id: string) => !existingSet.has(`${type}::${id}`);

    // ── 1. SPARSE_BRIEF ────────────────────────────────────────────────────
    const sparseBriefs = await prisma.brief.findMany({
        where: {
            workspaceId,
            status: 'active',
            deletedAt: null,
            createdAt: { lt: threeDaysAgo },
        },
        select: {
            id: true, name: true, briefNumber: true, createdAt: true,
            _count: { select: { documents: true } },
            lawyerInCharge: { select: { name: true } },
        },
    });

    for (const b of sparseBriefs) {
        if (b._count.documents > 0) continue;
        if (!isNew('SPARSE_BRIEF', b.id)) continue;
        const days = Math.floor((now.getTime() - new Date(b.createdAt).getTime()) / 86_400_000);
        detected.push({
            type: 'SPARSE_BRIEF',
            severity: days > 14 ? 'high' : 'medium',
            title: `No documents on "${b.name}"`,
            question: `Brief "${b.name}" (${b.briefNumber}) has been active for ${days} days with no documents uploaded. Should the initial filing documents be added?`,
            resourceType: 'brief',
            resourceId: b.id,
            resourceName: b.name,
            context: { days, lawyerInCharge: b.lawyerInCharge?.name },
        });
    }

    // ── 2. PLACEHOLDER_CLIENT ──────────────────────────────────────────────
    const placeholderClients = await prisma.client.findMany({
        where: {
            workspaceId,
            OR: [
                { email: { endsWith: '@client.com' } },
                { phone: null },
            ],
        },
        select: { id: true, name: true, email: true, phone: true },
    });

    // Get matter/invoice counts separately to avoid _count TS issues
    for (const c of placeholderClients) {
        if (!isNew('PLACEHOLDER_CLIENT', c.id)) continue;
        const [matterCount, invoiceCount] = await Promise.all([
            prisma.matter.count({ where: { clientId: c.id, status: 'active' } }),
            prisma.invoice.count({ where: { clientId: c.id, NOT: { status: { in: ['paid', 'PAID'] } } } }),
        ]);
        const hasActiveMatter = matterCount > 0 || invoiceCount > 0;
        detected.push({
            type: 'PLACEHOLDER_CLIENT',
            severity: hasActiveMatter ? 'high' : 'low',
            title: `Placeholder contact for "${c.name}"`,
            question: `Client "${c.name}" ${c.email?.endsWith('@client.com') ? `has a generated placeholder email (${c.email})` : 'is missing contact details'}. Can you provide their real email${!c.phone ? ' and phone number' : ''}?`,
            resourceType: 'client',
            resourceId: c.id,
            resourceName: c.name,
            context: { email: c.email, hasPhone: !!c.phone, activeMatters: matterCount },
        });
    }

    // ── 3. MISSING_COURT_OUTCOME ───────────────────────────────────────────
    // Past hearings with no proceedings recorded and no existing MatterQuestion
    const unproceedHearings = await prisma.calendarEntry.findMany({
        where: {
            type: 'COURT',
            date: { lt: now, gte: new Date(now.getTime() - 90 * 86_400_000) }, // last 90 days
            matter: { workspaceId },
            AND: [
                { OR: [{ proceedings: null }, { proceedings: '' }] },
                { OR: [{ outcome: null }, { outcome: '' }] },
            ],
            matterQuestions: { none: {} }, // no MatterQuestion already covering this
        },
        select: {
            id: true, date: true, court: true,
            matter: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 20,
    });

    for (const e of unproceedHearings) {
        if (!e.matter) continue;
        if (!isNew('MISSING_COURT_OUTCOME', e.id)) continue;
        const dateStr = new Date(e.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
        detected.push({
            type: 'MISSING_COURT_OUTCOME',
            severity: 'critical',
            title: `No court update for "${e.matter.name}"`,
            question: `The court hearing for "${e.matter.name}" on ${dateStr}${e.court ? ` at ${e.court}` : ''} has no recorded proceedings or outcome. What happened at this hearing?`,
            resourceType: 'calendar_entry',
            resourceId: e.id,
            resourceName: e.matter.name,
            context: { matterId: e.matter.id, date: e.date, court: e.court },
        });
    }

    // ── 4. MISSING_EXPENSE_PERIOD ──────────────────────────────────────────
    const gaps = await findExpenseGaps(workspaceId);
    for (const gap of gaps) {
        const pseudoId = `${workspaceId}-${gap.year}-${gap.monthNum}`;
        if (!isNew('MISSING_EXPENSE_PERIOD', pseudoId)) continue;
        detected.push({
            type: 'MISSING_EXPENSE_PERIOD',
            severity: 'medium',
            title: `No expenses recorded for ${gap.month}`,
            question: `No office expenses have been recorded for ${gap.month}, despite ${gap.hearingCount} court hearing${gap.hearingCount !== 1 ? 's' : ''} taking place. Can you update the system with expenses for this period?`,
            resourceType: 'expense',
            resourceId: pseudoId,
            resourceName: gap.month,
            context: { month: gap.month, hearingCount: gap.hearingCount },
        });
    }

    // ── 5. UNSCHEDULED_MATTER ──────────────────────────────────────────────
    // Active matters that have had past hearings but nothing scheduled in future
    const matters = await prisma.matter.findMany({
        where: {
            workspaceId,
            status: 'active',
            calendarEntries: {
                some: { date: { lt: now } },   // has had past hearings
                none: { date: { gte: now } },   // but none in future
            },
        },
        select: { id: true, name: true, court: true, lawyerInCharge: { select: { name: true } } },
        take: 20,
    });

    for (const m of matters) {
        if (!isNew('UNSCHEDULED_MATTER', m.id)) continue;
        detected.push({
            type: 'UNSCHEDULED_MATTER',
            severity: 'medium',
            title: `No hearing scheduled for "${m.name}"`,
            question: `Matter "${m.name}" is active and has had previous court appearances, but no future hearing is currently scheduled. Is the next hearing date known?`,
            resourceType: 'matter',
            resourceId: m.id,
            resourceName: m.name,
            context: { court: m.court, lawyerInCharge: m.lawyerInCharge?.name },
        });
    }

    // ── 6. FILING_DEADLINE_RISK ───────────────────────────────────────────
    // Upcoming hearings where adjournedFor suggests filing work is required,
    // but no documents have been uploaded to the related brief in the past 2 weeks
    const FILING_KEYWORDS = ['written address', 'reply', 'statement of defence', 'further affidavit', 'filing', 'originating process', 'motion', 'processes', 'defence'];
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);
    const threeWeeksFromNow = new Date(now.getTime() + 21 * 86_400_000);

    const upcomingFilingHearings = await prisma.calendarEntry.findMany({
        where: {
            type: 'COURT',
            date: { gte: now, lte: threeWeeksFromNow },
            matter: { workspaceId },
            adjournedFor: { not: null },
        },
        select: {
            id: true, date: true, adjournedFor: true,
            matter: { select: { id: true, name: true, court: true, lawyerInCharge: { select: { name: true } } } },
        },
    });

    for (const entry of upcomingFilingHearings) {
        const adjFor = (entry.adjournedFor || '').toLowerCase();
        if (!FILING_KEYWORDS.some(kw => adjFor.includes(kw))) continue;
        if (!entry.matter) continue;
        if (!isNew('FILING_DEADLINE_RISK', entry.id)) continue;

        // Check if any brief linked to this matter has recent documents
        const recentDocs = await prisma.document.count({
            where: {
                brief: { matterId: entry.matter.id, deletedAt: null },
                uploadedAt: { gte: twoWeeksAgo },
            },
        });
        if (recentDocs > 0) continue;

        const daysLeft = Math.ceil((entry.date.getTime() - now.getTime()) / 86_400_000);
        const dateStr = new Date(entry.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
        detected.push({
            type: 'FILING_DEADLINE_RISK',
            severity: daysLeft <= 7 ? 'critical' : 'high',
            title: `Filing due — ${entry.matter.name}`,
            question: `The next hearing for "${entry.matter.name}" on ${dateStr}${entry.matter.court ? ` at ${entry.matter.court}` : ''} is scheduled for "${entry.adjournedFor}". No documents have been filed in the past 2 weeks. Are the required processes ready to file?`,
            resourceType: 'calendar_entry',
            resourceId: entry.id,
            resourceName: entry.matter.name,
            context: { matterId: entry.matter.id, date: entry.date, adjournedFor: entry.adjournedFor, daysLeft, lawyerInCharge: entry.matter.lawyerInCharge?.name },
        });
    }

    // ── 7. OVERDUE_MILESTONE ─────────────────────────────────────────────────
    // Wrapped in try/catch — table may not exist on instances where the schema
    // migration hasn't been applied yet (graceful degradation).
    try {
        await prisma.litigationMilestone.updateMany({
            where: {
                workspaceId,
                status: { in: ['PENDING', 'IN_PROGRESS'] },
                dueDate: { lt: now },
            },
            data: { status: 'OVERDUE' },
        });

        const overdueMilestones = await prisma.litigationMilestone.findMany({
            where: { workspaceId, status: 'OVERDUE' },
            select: {
                id: true, type: true, dueDate: true,
                matter: { select: { id: true, name: true, lawyerInCharge: { select: { name: true } } } },
            },
            orderBy: { dueDate: 'asc' },
            take: 20,
        });

        const { MILESTONE_CONFIG } = await import('@/lib/litigation/milestones');
        for (const m of overdueMilestones) {
            if (!m.matter) continue;
            if (!isNew('OVERDUE_MILESTONE', m.id)) continue;
            const cfg = MILESTONE_CONFIG[m.type as keyof typeof MILESTONE_CONFIG];
            const daysOverdue = m.dueDate
                ? Math.floor((now.getTime() - new Date(m.dueDate).getTime()) / 86_400_000)
                : null;
            detected.push({
                type: 'OVERDUE_MILESTONE',
                severity: daysOverdue && daysOverdue > 14 ? 'critical' : daysOverdue && daysOverdue > 7 ? 'high' : 'medium',
                title: `Overdue: ${cfg?.label ?? m.type} — ${m.matter.name}`,
                question: `The litigation milestone "${cfg?.label ?? m.type}" for matter "${m.matter.name}" ${m.dueDate ? `was due ${new Date(m.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'has no due date set'}. Has this step been completed? If so, please mark it done and note the completion date.`,
                resourceType: 'litigation_milestone',
                resourceId: m.id,
                resourceName: m.matter.name,
                context: {
                    milestoneType: m.type,
                    milestoneLabel: cfg?.label,
                    matterId: m.matter.id,
                    dueDate: m.dueDate,
                    daysOverdue,
                    lawyerInCharge: m.matter.lawyerInCharge?.name,
                },
            });
        }
    } catch {
        // LitigationMilestone table not yet migrated — skip silently
    }

    return detected;
}

export async function runAnomalyScan(workspaceId: string): Promise<{ created: number; skipped: number }> {
    const anomalies = await detectAnomalies(workspaceId);
    let created = 0;

    for (const a of anomalies) {
        await prisma.workspaceAnomaly.create({
            data: {
                workspaceId,
                type: a.type,
                severity: a.severity,
                status: 'open',
                title: a.title,
                question: a.question,
                resourceType: a.resourceType,
                resourceId: a.resourceId,
                resourceName: a.resourceName,
                context: a.context ?? {},
            },
        });
        created++;
    }

    return { created, skipped: 0 };
}

export async function runAnomalyScanAllWorkspaces(): Promise<void> {
    const workspaces = await prisma.workspace.findMany({ select: { id: true } });
    await Promise.all(workspaces.map(w => runAnomalyScan(w.id).catch(console.error)));
}
