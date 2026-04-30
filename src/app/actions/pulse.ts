'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function relativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 2) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getInitials(name: string): string {
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

async function assertWorkspaceMember(workspaceId: string): Promise<{ userId: string; role: string } | null> {
    const session = await auth();
    if (!session?.user?.id) return null;
    // Fast path: session is already scoped to a workspace
    if (session.user.workspaceId !== workspaceId) return null;
    return { userId: session.user.id, role: session.user.role ?? 'member' };
}

export type PulseSeverity = 'urgent' | 'warning' | 'info' | 'success';
export type PulseSection = 'urgent' | 'thisWeek' | 'insights';
export type PulseIconType = 'alert' | 'invoice' | 'calendar' | 'person' | 'email' | 'star' | 'chart' | 'document';
export type PulseCategory = 'matter' | 'billing' | 'calendar' | 'compliance' | 'client' | 'eureka' | 'firm' | 'user';

export interface PulseItem {
    id: string;
    severity: PulseSeverity;
    section: PulseSection;
    iconType: PulseIconType;
    title: string;
    description: string;
    timeLabel: string;
    categories: PulseCategory[];
    ctaLabel: string;
    ctaHref: string;
    lawyers?: { initials: string; label?: string }[];
}

export interface PulseFirmStats {
    activeBriefs: number;
    activeBriefsDelta: string;
    unbilledMatters: number;
    unbilledAmount: string;
    hearingsThisWeek: number;
    nextHearingLabel: string;
    openEscalations: number;
}

export interface PulseUserStats {
    myBriefs: number;
    myBriefsSubLabel: string;
    tasksOverdue: number;
    myHearings: number;
    unreadNotifications: number;
}

export async function getPulseFirmStats(workspaceId: string): Promise<PulseFirmStats> {
    const fallback: PulseFirmStats = {
        activeBriefs: 0, activeBriefsDelta: 'No new this month',
        unbilledMatters: 0, unbilledAmount: '₦0',
        hearingsThisWeek: 0, nextHearingLabel: 'None scheduled',
        openEscalations: 0,
    };

    const caller = await assertWorkspaceMember(workspaceId);
    if (!caller) return fallback;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    try {
        const [
            activeBriefs, newBriefsThisMonth, unbilledMatters,
            hearingsThisWeek, openEscalations, outstandingInvoices, nextHearing,
        ] = await Promise.all([
            prisma.brief.count({ where: { workspaceId, status: 'active', deletedAt: null } }),
            prisma.brief.count({ where: { workspaceId, status: 'active', deletedAt: null, createdAt: { gte: startOfMonth } } }),
            prisma.matter.count({ where: { workspaceId, status: { not: 'Closed' }, invoices: { none: { status: { in: ['sent', 'paid'] } } } } }),
            prisma.calendarEntry.count({ where: { date: { gte: today, lte: weekEnd }, matter: { workspaceId } } }),
            prisma.task.count({ where: { workspaceId, status: { not: 'completed' }, priority: { in: ['high', 'urgent'] }, dueDate: { lt: today } } }),
            prisma.invoice.aggregate({ where: { client: { workspaceId }, status: { in: ['sent', 'pending', 'overdue'] } }, _sum: { totalAmount: true } }),
            prisma.calendarEntry.findFirst({ where: { date: { gte: today }, matter: { workspaceId } }, orderBy: { date: 'asc' }, select: { date: true } }),
        ]);

        return {
            activeBriefs,
            activeBriefsDelta: newBriefsThisMonth > 0 ? `+${newBriefsThisMonth} this month` : 'No new this month',
            unbilledMatters,
            unbilledAmount: formatNaira(Number(outstandingInvoices._sum.totalAmount || 0)),
            hearingsThisWeek,
            nextHearingLabel: nextHearing
                ? nextHearing.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                : 'None scheduled',
            openEscalations,
        };
    } catch (e) {
        console.error('[Pulse] getPulseFirmStats error:', e);
        return fallback;
    }
}

export async function getPulseUserStats(workspaceId: string): Promise<PulseUserStats> {
    const fallback: PulseUserStats = {
        myBriefs: 0, myBriefsSubLabel: 'None active',
        tasksOverdue: 0, myHearings: 0, unreadNotifications: 0,
    };

    const caller = await assertWorkspaceMember(workspaceId);
    if (!caller) return fallback;
    const { userId } = caller;

    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    try {
        const [myBriefs, myBriefsAsPrimary, tasksOverdue, myHearings, unreadNotifications] = await Promise.all([
            prisma.brief.count({ where: { lawyerId: userId, status: 'active', deletedAt: null } }),
            prisma.brief.count({ where: { lawyerInChargeId: userId, status: 'active', deletedAt: null } }),
            prisma.task.count({ where: { assignedToId: userId, status: { not: 'completed' }, dueDate: { lt: today } } }),
            prisma.calendarEntry.count({ where: { date: { gte: today, lte: weekEnd }, appearances: { some: { id: userId } } } }),
            prisma.notification.count({ where: { recipientId: userId, status: 'unread' } }),
        ]);

        return {
            myBriefs,
            myBriefsSubLabel: myBriefsAsPrimary > 0 ? `Primary on ${myBriefsAsPrimary}` : 'Supporting role',
            tasksOverdue,
            myHearings,
            unreadNotifications,
        };
    } catch (e) {
        console.error('[Pulse] getPulseUserStats error:', e);
        return fallback;
    }
}

export async function getPulseFeedFirmwide(workspaceId: string): Promise<PulseItem[]> {
    const caller = await assertWorkspaceMember(workspaceId);
    if (!caller) return [];

    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    try {
        // All queries run in parallel — none depend on each other
        const [
            overdueTasks,
            overdueInvoices,
            upcomingHearings,
            unbilledClients,
            recentEmails,
            monthRevenue,
            monthExpenses,
            outstandingInvoiceCount,
        ] = await Promise.all([
            prisma.task.findMany({
                where: { workspaceId, status: { not: 'completed' }, priority: { in: ['high', 'urgent'] }, dueDate: { lt: today } },
                take: 2, orderBy: { dueDate: 'asc' },
                include: { assignedTo: { select: { name: true } }, brief: { select: { name: true, id: true } }, matter: { select: { name: true } } },
            }),
            prisma.invoice.findMany({
                where: { client: { workspaceId }, status: { in: ['sent', 'overdue'] }, dueDate: { lt: today } },
                take: 2, orderBy: { dueDate: 'asc' },
                include: { client: { select: { name: true } } },
            }),
            prisma.calendarEntry.findMany({
                where: { date: { gte: today, lte: weekEnd }, matter: { workspaceId } },
                take: 2, orderBy: { date: 'asc' },
                include: { matter: { include: { lawyers: { include: { lawyer: { select: { name: true } } }, take: 3 } } } },
            }),
            prisma.client.findMany({
                where: { workspaceId, matters: { some: { status: { not: 'Closed' }, invoices: { none: { status: { in: ['sent', 'paid'] } } } } } },
                take: 1,
                include: { matters: { where: { status: { not: 'Closed' }, invoices: { none: { status: { in: ['sent', 'paid'] } } } }, select: { name: true } } },
            }),
            prisma.inboundEmail.findMany({
                where: { workspaceId, receivedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                take: 3, orderBy: { receivedAt: 'desc' },
                select: { id: true, fromEmail: true, fromName: true, subject: true, attachmentCount: true, receivedAt: true, client: { select: { name: true } }, matter: { select: { name: true } } },
            }),
            prisma.payment.aggregate({ where: { client: { workspaceId }, date: { gte: startOfMonth } }, _sum: { amount: true } }),
            prisma.expense.aggregate({ where: { workspaceId, date: { gte: startOfMonth } }, _sum: { amount: true } }),
            prisma.invoice.count({ where: { client: { workspaceId }, status: { in: ['sent', 'pending', 'overdue'] } } }),
        ]);

        const items: PulseItem[] = [];

        for (const task of overdueTasks) {
            if (!task.dueDate) continue;
            const daysPast = Math.max(1, Math.floor((today.getTime() - task.dueDate.getTime()) / 86400000));
            const relatedTo = task.brief?.name || task.matter?.name;
            items.push({
                id: `task-${task.id}`, severity: 'urgent', section: 'urgent', iconType: 'alert',
                title: `Escalation unresolved — ${relatedTo || task.title}`,
                description: `"${task.title}" assigned to ${task.assignedTo?.name || 'a team member'} has received no update in ${daysPast} day${daysPast !== 1 ? 's' : ''}.${relatedTo ? ` Related to: ${relatedTo}.` : ''} ${daysPast > 2 ? 'Now escalated to managing partner.' : 'Action required.'}`,
                timeLabel: daysPast === 1 ? '1 day ago' : `${daysPast} days ago`,
                categories: ['matter', 'firm'], ctaLabel: 'Review escalation', ctaHref: '/management/office',
            });
        }

        for (const inv of overdueInvoices) {
            if (!inv.dueDate) continue;
            const daysOverdue = Math.max(1, Math.floor((today.getTime() - inv.dueDate.getTime()) / 86400000));
            items.push({
                id: `inv-${inv.id}`, severity: 'urgent', section: 'urgent', iconType: 'invoice',
                title: `Invoice overdue — ${inv.client.name}`,
                description: `Invoice #${inv.invoiceNumber} for ${formatNaira(Number(inv.totalAmount))} sent on ${inv.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} remains unpaid. ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.`,
                timeLabel: `${daysOverdue}d ago`, categories: ['billing', 'firm'], ctaLabel: 'Send reminder', ctaHref: '/management/office',
            });
        }

        for (const hearing of upcomingHearings) {
            const daysUntil = Math.max(1, Math.ceil((hearing.date.getTime() - today.getTime()) / 86400000));
            const courtName = hearing.court || hearing.matter?.court || 'Court';
            const matterLawyers = (hearing.matter?.lawyers || []).map(l => l.lawyer);
            items.push({
                id: `hearing-${hearing.id}`, severity: 'warning', section: 'thisWeek', iconType: 'calendar',
                title: `Hearing in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — ${courtName}`,
                description: `${hearing.matter?.name || hearing.title || 'Court hearing'} listed for ${hearing.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}.`,
                timeLabel: 'Today', categories: ['calendar'], ctaLabel: 'View matter', ctaHref: '/calendar',
                lawyers: matterLawyers.slice(0, 3).map(l => ({ initials: getInitials(l.name || 'U'), label: l.name || '' })),
            });
        }

        for (const client of unbilledClients) {
            if (client.matters.length === 0) continue;
            const matterNames = client.matters.slice(0, 2).map(m => m.name).join('; ');
            items.push({
                id: `unbilled-${client.id}`, severity: 'warning', section: 'thisWeek', iconType: 'person',
                title: `${client.name} has ${client.matters.length} unbilled matter${client.matters.length !== 1 ? 's' : ''}`,
                description: `Active matter${client.matters.length !== 1 ? 's' : ''} with no invoice raised: ${matterNames}. Prepare consolidated invoice.`,
                timeLabel: 'Pending', categories: ['billing', 'client'], ctaLabel: 'Prepare invoice', ctaHref: '/management/clients',
            });
        }

        for (const email of recentEmails) {
            const sender = email.fromName || email.fromEmail;
            const matched = email.matter?.name || email.client?.name;
            items.push({
                id: `email-${email.id}`, severity: matched ? 'info' : 'warning', section: 'thisWeek', iconType: 'email',
                title: `Email received — ${email.subject}`,
                description: `From ${sender}${matched ? ` · Linked to: ${matched}` : ' · Unmatched — no matter found'}. ${email.attachmentCount > 0 ? `${email.attachmentCount} attachment${email.attachmentCount !== 1 ? 's' : ''} filed.` : 'No attachments.'}`,
                timeLabel: relativeTime(email.receivedAt), categories: ['client', 'firm'],
                ctaLabel: matched ? 'View matter' : 'Review',
                ctaHref: email.matter ? `/briefs?matter=${email.matter.name}` : '/management/clients',
            });
        }

        const revenue = Number(monthRevenue._sum.amount || 0);
        const expenses = Number(monthExpenses._sum.amount || 0);
        const net = revenue - expenses;
        const monthName = today.toLocaleDateString('en-GB', { month: 'long' });

        items.push({
            id: 'snapshot-monthly', severity: 'success', section: 'insights', iconType: 'chart',
            title: `Revenue vs expenses — ${monthName} snapshot`,
            description: `${monthName} to date: ${formatNaira(revenue)} revenue, ${formatNaira(expenses)} expenses. Net: ${formatNaira(Math.abs(net))}${net < 0 ? ' deficit' : ''}. ${outstandingInvoiceCount} invoice${outstandingInvoiceCount !== 1 ? 's' : ''} outstanding.`,
            timeLabel: 'Today', categories: ['billing', 'firm'], ctaLabel: 'Full analytics', ctaHref: '/analytics',
        });

        return items;
    } catch (e) {
        console.error('[Pulse] getPulseFeedFirmwide error:', e);
        return [];
    }
}

export async function getPulseFeedUser(workspaceId: string): Promise<PulseItem[]> {
    const caller = await assertWorkspaceMember(workspaceId);
    if (!caller) return [];
    const { userId } = caller;

    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    try {
        const [myOverdueTasks, myUrgentBriefs, myActiveBriefs, recentLeadBriefs, matterNoContact] = await Promise.all([
            prisma.task.findMany({
                where: { assignedToId: userId, status: { not: 'completed' }, dueDate: { lt: today } },
                take: 2, orderBy: { dueDate: 'asc' },
                include: { brief: { select: { name: true, id: true } }, matter: { select: { name: true } } },
            }),
            prisma.brief.findMany({
                where: { lawyerId: userId, status: 'active', deletedAt: null, dueDate: { gte: today, lte: threeDaysFromNow } },
                take: 1, orderBy: { dueDate: 'asc' },
                include: { client: { select: { name: true } } },
            }),
            prisma.brief.findMany({
                where: { lawyerId: userId, status: 'active', deletedAt: null },
                take: 10, orderBy: { createdAt: 'desc' },
                include: { documents: { select: { id: true } } },
            }),
            prisma.brief.findMany({
                where: { lawyerInChargeId: userId, status: 'active', deletedAt: null },
                take: 1, orderBy: { createdAt: 'desc' },
                include: { client: { select: { name: true } }, matter: { include: { lawyers: { include: { lawyer: { select: { name: true } } }, take: 3 } } } },
            }),
            prisma.matter.findFirst({
                where: { workspaceId, status: { not: 'Closed' }, lawyers: { some: { lawyerId: userId } }, lastClientContact: { lt: thirtyDaysAgo } },
                orderBy: { lastClientContact: 'asc' },
                include: { client: { select: { name: true } } },
            }),
        ]);

        const items: PulseItem[] = [];

        for (const task of myOverdueTasks) {
            if (!task.dueDate) continue;
            const daysPast = Math.max(1, Math.floor((today.getTime() - task.dueDate.getTime()) / 86400000));
            const relatedName = task.brief?.name || task.matter?.name;
            items.push({
                id: `my-task-${task.id}`, severity: 'urgent', section: 'urgent', iconType: 'calendar',
                title: `Overdue task — ${task.title}`,
                description: `"${task.title}" was due ${daysPast} day${daysPast !== 1 ? 's' : ''} ago.${relatedName ? ` Related to: ${relatedName}.` : ''} Action required.`,
                timeLabel: 'Today', categories: ['calendar', 'user'], ctaLabel: 'Open task', ctaHref: '/management/office',
            });
        }

        for (const brief of myUrgentBriefs) {
            if (!brief.dueDate) continue;
            const daysLeft = Math.max(0, Math.ceil((brief.dueDate.getTime() - today.getTime()) / 86400000));
            items.push({
                id: `my-brief-due-${brief.id}`, severity: 'urgent', section: 'urgent', iconType: 'document',
                title: `Due ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`} — ${brief.name}`,
                description: `Brief: ${brief.name}${brief.client?.name ? ` for ${brief.client.name}` : ''} is due ${brief.dueDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}. Confirm status and file.`,
                timeLabel: 'Today', categories: ['calendar', 'user'], ctaLabel: 'Open brief', ctaHref: `/briefs/${brief.id}`,
            });
        }

        const sparseBrief = myActiveBriefs.find(b => b.documents.length < 3);
        if (sparseBrief) {
            items.push({
                id: `sparse-brief-${sparseBrief.id}`, severity: 'warning', section: 'urgent', iconType: 'document',
                title: `Brief has only ${sparseBrief.documents.length} file${sparseBrief.documents.length !== 1 ? 's' : ''} — upload more`,
                description: `${sparseBrief.name} was created ${relativeTime(sparseBrief.createdAt)}. Only ${sparseBrief.documents.length} file${sparseBrief.documents.length !== 1 ? 's' : ''} uploaded. Add pleadings, correspondence, and client instructions.`,
                timeLabel: relativeTime(sparseBrief.createdAt), categories: ['matter', 'user'], ctaLabel: 'Upload files', ctaHref: `/briefs/${sparseBrief.id}`,
            });
        }

        for (const brief of recentLeadBriefs) {
            const matterLawyers = (brief.matter?.lawyers || []).map(l => l.lawyer);
            items.push({
                id: `recent-brief-${brief.id}`, severity: 'info', section: 'thisWeek', iconType: 'document',
                title: `Brief assigned — you are lead counsel`,
                description: `${brief.name} opened ${relativeTime(brief.createdAt)}.${brief.client?.name ? ` Client: ${brief.client.name}.` : ''}`,
                timeLabel: relativeTime(brief.createdAt), categories: ['matter', 'user'], ctaLabel: 'View brief', ctaHref: `/briefs/${brief.id}`,
                lawyers: matterLawyers.slice(0, 3).map(l => ({ initials: getInitials(l.name || 'U'), label: l.name || '' })),
            });
        }

        if (matterNoContact) {
            const since = matterNoContact.lastClientContact || matterNoContact.createdAt;
            const daysSince = Math.floor((today.getTime() - since.getTime()) / 86400000);
            items.push({
                id: `no-contact-${matterNoContact.id}`, severity: 'info', section: 'thisWeek', iconType: 'person',
                title: `No client contact in ${daysSince} days — ${matterNoContact.client?.name || 'Client'}`,
                description: `${matterNoContact.client?.name || 'This client'} has not received communication in ${daysSince} days for matter: ${matterNoContact.name}.`,
                timeLabel: 'Today', categories: ['client', 'user'], ctaLabel: 'Log communication', ctaHref: '/management/clients',
            });
        }

        return items;
    } catch (e) {
        console.error('[Pulse] getPulseFeedUser error:', e);
        return [];
    }
}
