"use client";

import { useState, useMemo } from 'react';
import {
    AlertCircle,
    FileText,
    Calendar,
    User,
    Mail,
    Star,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import styles from './Pulse.module.css';
import type {
    PulseItem,
    PulseFirmStats,
    PulseUserStats,
    PulseCategory,
    PulseIconType,
} from '@/app/actions/pulse';
import PendingQuestionsPanel from './PendingQuestionsPanel';

const ICON_MAP: Record<PulseIconType, React.ElementType> = {
    alert: AlertCircle,
    invoice: FileText,
    calendar: Calendar,
    person: User,
    email: Mail,
    star: Star,
    chart: TrendingUp,
    document: FileText,
};

const CATEGORY_LABELS: Record<PulseCategory, string> = {
    matter: 'Matter',
    billing: 'Billing',
    calendar: 'Calendar',
    compliance: 'Compliance',
    client: 'Client',
    eureka: 'Eureka',
    firm: 'Firm',
    user: 'My brief',
};

const SECTION_LABELS_FIRM: Record<string, string> = {
    urgent: 'Urgent — requires action',
    thisWeek: 'This week',
    insights: 'Insights',
};

const SECTION_LABELS_USER: Record<string, string> = {
    urgent: 'Your urgent items',
    thisWeek: 'Your matters',
    insights: 'From Eureka',
};

type FilterType = 'all' | 'urgent' | 'billing' | 'calendar';

interface PendingQuestion {
    id: string;
    question: string;
    askedAt: Date | string;
    matter: { id: string; name: string; caseNumber: string | null; court: string | null };
    calendarEntry: { id: string; date: Date | string; title: string | null };
}

interface PulseClientProps {
    firmStats: PulseFirmStats;
    userStats: PulseUserStats;
    firmFeed: PulseItem[];
    userFeed: PulseItem[];
    userName: string;
    attentionCount: number;
    pendingQuestions: PendingQuestion[];
}

export default function PulseClient({
    firmStats,
    userStats,
    firmFeed,
    userFeed,
    attentionCount,
    pendingQuestions,
}: PulseClientProps) {
    const [view, setView] = useState<'firm' | 'user'>('firm');
    const [filter, setFilter] = useState<FilterType>('all');

    const feed = view === 'firm' ? firmFeed : userFeed;
    const sectionLabels = view === 'firm' ? SECTION_LABELS_FIRM : SECTION_LABELS_USER;

    const filteredFeed = useMemo(() => {
        if (filter === 'all') return feed;
        if (filter === 'urgent') return feed.filter(i => i.severity === 'urgent');
        if (filter === 'billing') return feed.filter(i => i.categories.includes('billing'));
        if (filter === 'calendar') return feed.filter(i => i.categories.includes('calendar'));
        return feed;
    }, [feed, filter]);

    const sections = useMemo(() => {
        const result: Array<{ key: string; label: string; items: PulseItem[] }> = [];
        for (const key of ['urgent', 'thisWeek', 'insights']) {
            const items = filteredFeed.filter(i => i.section === key);
            if (items.length > 0) {
                result.push({ key, label: sectionLabels[key] || key, items });
            }
        }
        return result;
    }, [filteredFeed, sectionLabels]);

    const today = new Date();
    const dateLabel = today.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className={styles.page}>
            {/* Topbar */}
            <div className={styles.topbar}>
                <div className={styles.topbarLeft}>
                    <h1 className={styles.topbarTitle}>The Pulse</h1>
                    <p className={styles.topbarSub}>
                        {dateLabel}
                        {attentionCount > 0 && (
                            <> &middot; {attentionCount} item{attentionCount !== 1 ? 's' : ''} need{attentionCount === 1 ? 's' : ''} your attention</>
                        )}
                    </p>
                </div>
                <div className={styles.toggleWrap}>
                    <button
                        className={`${styles.toggleBtn} ${view === 'firm' ? styles.toggleActive : ''}`}
                        onClick={() => { setView('firm'); setFilter('all'); }}
                    >
                        Firmwide
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${view === 'user' ? styles.toggleActive : ''}`}
                        onClick={() => { setView('user'); setFilter('all'); }}
                    >
                        My Pulse
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className={styles.statsRow}>
                {view === 'firm' ? (
                    <>
                        <StatCard
                            label="Active briefs"
                            value={firmStats.activeBriefs}
                            delta={firmStats.activeBriefsDelta}
                            deltaType="up"
                        />
                        <StatCard
                            label="Unbilled matters"
                            value={firmStats.unbilledMatters}
                            delta={`${firmStats.unbilledAmount} outstanding`}
                            deltaType="down"
                        />
                        <StatCard
                            label="Hearings this week"
                            value={firmStats.hearingsThisWeek}
                            delta={`Next: ${firmStats.nextHearingLabel}`}
                            deltaType="neutral"
                        />
                        <StatCard
                            label="Open escalations"
                            value={firmStats.openEscalations}
                            delta={firmStats.openEscalations > 0 ? 'Unresolved 48h+' : 'All clear'}
                            deltaType={firmStats.openEscalations > 0 ? 'down' : 'up'}
                            urgent={firmStats.openEscalations > 0}
                        />
                    </>
                ) : (
                    <>
                        <StatCard
                            label="My briefs"
                            value={userStats.myBriefs}
                            delta={userStats.myBriefsSubLabel}
                            deltaType="neutral"
                        />
                        <StatCard
                            label="Tasks overdue"
                            value={userStats.tasksOverdue}
                            delta={userStats.tasksOverdue > 0 ? 'Action needed' : 'All clear'}
                            deltaType={userStats.tasksOverdue > 0 ? 'down' : 'up'}
                            urgent={userStats.tasksOverdue > 0}
                        />
                        <StatCard
                            label="My hearings"
                            value={userStats.myHearings}
                            delta="This week"
                            deltaType="neutral"
                        />
                        <StatCard
                            label="Notifications"
                            value={userStats.unreadNotifications}
                            delta="Unread"
                            deltaType="neutral"
                        />
                    </>
                )}
            </div>

            {/* Feed Area */}
            <div className={styles.feedArea}>
                {pendingQuestions.length > 0 && (
                    <PendingQuestionsPanel questions={pendingQuestions} />
                )}

                <div className={styles.feedHeader}>
                    <span className={styles.feedLabel}>
                        {view === 'firm' ? 'Firmwide activity' : 'My activity'}
                    </span>
                    <div className={styles.filterRow}>
                        {(['all', 'urgent', 'billing', 'calendar'] as FilterType[]).map(f => (
                            <button
                                key={f}
                                className={`${styles.filterChip} ${filter === f ? styles.filterChipOn : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredFeed.length === 0 && (
                    <div className={styles.emptyState}>
                        <Star size={22} />
                        <p>No items match this filter — you&apos;re all caught up.</p>
                    </div>
                )}

                {sections.map(section => (
                    <div key={section.key}>
                        <div className={styles.sectionDivider}>{section.label}</div>
                        <div className={styles.sectionItems}>
                            {section.items.map(item => (
                                <PulseCard key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Sub-components ── */

function StatCard({
    label,
    value,
    delta,
    deltaType,
    urgent,
}: {
    label: string;
    value: number;
    delta: string;
    deltaType: 'up' | 'down' | 'neutral';
    urgent?: boolean;
}) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statLabel}>{label}</div>
            <div className={`${styles.statVal} ${urgent ? styles.statValUrgent : ''}`}>{value}</div>
            <div className={`${styles.statDelta} ${deltaType === 'up' ? styles.deltaUp : deltaType === 'down' ? styles.deltaDown : styles.deltaNeutral}`}>
                {delta}
            </div>
        </div>
    );
}

function PulseCard({ item }: { item: PulseItem }) {
    const Icon = ICON_MAP[item.iconType] || AlertCircle;

    return (
        <div className={`${styles.pulseCard} ${styles[`card_${item.severity}` as keyof typeof styles]}`}>
            <div className={`${styles.iconWrap} ${styles[`ic_${item.severity}` as keyof typeof styles]}`}>
                <Icon size={15} />
            </div>
            <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                    <div className={styles.cardTitle}>{item.title}</div>
                    <div className={styles.cardTime}>{item.timeLabel}</div>
                </div>
                <p className={styles.cardDesc}>{item.description}</p>
                <div className={styles.cardFooter}>
                    {item.categories.map(cat => (
                        <span
                            key={cat}
                            className={`${styles.chip} ${styles[`chip_${cat}` as keyof typeof styles]}`}
                        >
                            {CATEGORY_LABELS[cat] || cat}
                        </span>
                    ))}
                    {item.lawyers && item.lawyers.length > 0 && (
                        <div className={styles.lawyersRow}>
                            {item.lawyers.slice(0, 3).map((l, i) => (
                                <div
                                    key={i}
                                    className={`${styles.lawyerAvatar} ${styles[`avatar_${i}` as keyof typeof styles]}`}
                                    title={l.label}
                                >
                                    {l.initials}
                                </div>
                            ))}
                            <span className={styles.lawyerLabel}>
                                {item.lawyers.length > 1
                                    ? `${item.lawyers.length} assigned`
                                    : item.lawyers[0]?.label || ''}
                            </span>
                        </div>
                    )}
                    <Link href={item.ctaHref} className={styles.ctaLink}>
                        {item.ctaLabel} &rarr;
                    </Link>
                </div>
            </div>
        </div>
    );
}
