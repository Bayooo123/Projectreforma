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
    ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import styles from './Pulse.module.css';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Icon } from '@/components/mobile/MobileShared';
import type {
    PulseItem,
    PulseFirmStats,
    PulseUserStats,
    PulseCategory,
    PulseIconType,
    MyBrief,
} from '@/app/actions/pulse';
import PendingQuestionsPanel from './PendingQuestionsPanel';
import AnomalyPanel from './AnomalyPanel';
import MyBriefsGrid from './MyBriefsGrid';
import DailyWorkLogPanel from './DailyWorkLogPanel';
import FirmWorkLogBoard from './FirmWorkLogBoard';
import type { WorkEntry } from '@/app/actions/work-entries';

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

interface Brief {
    id: string;
    name: string;
    customTitle: string | null;
    briefNumber: string;
    customBriefNumber: string | null;
}

interface TeamMember {
    userId: string;
    role: string | null;
    user: { id: string; name: string | null; email: string };
}

interface PulseClientProps {
    firmStats: PulseFirmStats;
    userStats: PulseUserStats;
    firmFeed: PulseItem[];
    userFeed: PulseItem[];
    userName: string;
    attentionCount: number;
    pendingQuestions: PendingQuestion[];
    anomalies: any[];
    myBriefs: MyBrief[];
    todayEntries: WorkEntry[];
    firmWorkLog: WorkEntry[];
    teamMembers: TeamMember[];
    briefs: Brief[];
    userId: string;
    workspaceId: string;
    isAdmin: boolean;
}

export default function PulseClient({
    firmStats,
    userStats,
    firmFeed,
    userFeed,
    attentionCount,
    pendingQuestions,
    anomalies,
    myBriefs,
    todayEntries,
    firmWorkLog,
    teamMembers,
    briefs,
    userName,
    userId,
    workspaceId,
    isAdmin,
}: PulseClientProps) {
    const [view, setView] = useState<'firm' | 'user'>('firm');
    const [filter, setFilter] = useState<FilterType>('all');
    const [logWorkOpen, setLogWorkOpen] = useState(false);

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

    const isMobile = useIsMobile();
    const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if (isMobile) {
        const nextHearing = feed.find(i => i.categories.includes('calendar'));
        return (
            <div className="rm-screen">
                <div className="rm-scroll">
                    {/* Greeting */}
                    <div className="rm-hdr-row" style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 20px 2px', alignItems: 'center' }}>
                        <div className="rm-greet" style={{ padding: 0 }}>
                            <span className="rm-eyebrow">{dateLabel}</span>
                            <h1 style={{ marginTop: 2, fontSize: '28px' }}>Good morning, <span className="nm" style={{ color: '#065F46' }}>{userName || 'Counsel'}</span></h1>
                        </div>
                        <div className="rm-avatar">{userName ? userName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'C'}</div>
                    </div>

                    {/* Metric Chips */}
                    <div className="rm-chips-scroll">
                        <div className="rm-mchip">
                            <div className="ic" style={{ background: '#ECFDF5', color: '#065F46' }}>
                                <Icon n="file" s={16} />
                            </div>
                            <div className="v">{userStats.myBriefs}</div>
                            <div className="l">My Briefs</div>
                        </div>
                        <div className="rm-mchip">
                            <div className="ic" style={{ background: userStats.tasksOverdue > 0 ? '#FEE2E2' : '#F1F5F9', color: userStats.tasksOverdue > 0 ? '#B91C1C' : '#475569' }}>
                                <Icon n="alert" s={16} />
                            </div>
                            <div className="v">{userStats.tasksOverdue}</div>
                            <div className="l">Tasks Overdue</div>
                        </div>
                        <div className="rm-mchip">
                            <div className="ic" style={{ background: '#EEF4FF', color: '#1E40AF' }}>
                                <Icon n="gavel" s={16} />
                            </div>
                            <div className="v">{userStats.myHearings}</div>
                            <div className="l">My Hearings</div>
                        </div>
                    </div>

                    {/* Hero Court Card */}
                    {nextHearing && (
                        <Link href={nextHearing.ctaHref} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="rm-hero" style={{ marginTop: '16px' }}>
                                <div className="top">
                                    <span className="tag-live">
                                        <span className="dot" />
                                        {nextHearing.severity === 'urgent' ? 'Urgent' : 'Upcoming'}
                                    </span>
                                    <span className="cd">{nextHearing.timeLabel}</span>
                                </div>
                                <h2>{nextHearing.title}</h2>
                                <div className="meta">
                                    <div className="r">
                                        <Icon n="clock" s={14} c="rgba(234,244,239,.8)" />
                                        <span>Today</span>
                                    </div>
                                    <div className="r">
                                        <Icon n="pin" s={14} c="rgba(234,244,239,.8)" />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {nextHearing.description}
                                        </span>
                                    </div>
                                </div>
                                <div className="when">
                                    <span className="t">Live Appearance</span>
                                    <span className="go">View brief <Icon n="chevR" s={14} c="#A7F3D0" /></span>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Needs Action List */}
                    <div className="rm-sec-label" style={{ marginTop: '24px' }}>
                        <span className="t">Needs Your Attention</span>
                    </div>
                    <div className="rm-list">
                        {filteredFeed.filter(i => i.severity === 'urgent').map(item => {
                            let iconName = 'alert';
                            let iconBg = '#FEE2E2';
                            let iconColor = '#B91C1C';
                            if (item.categories.includes('billing')) {
                                iconName = 'naira';
                                iconBg = '#ECFDF5';
                                iconColor = '#059669';
                            } else if (item.categories.includes('calendar')) {
                                iconName = 'cal';
                                iconBg = '#EEF4FF';
                                iconColor = '#1E40AF';
                            } else if (item.categories.includes('compliance')) {
                                iconName = 'shield';
                                iconBg = '#FEF3C7';
                                iconColor = '#D97706';
                            }

                            return (
                                <Link key={item.id} href={item.ctaHref} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="rm-need">
                                        <div className="ic" style={{ background: iconBg, color: iconColor }}>
                                            <Icon n={iconName} s={20} />
                                        </div>
                                        <div className="mid">
                                            <div className="ttl">{item.title}</div>
                                            <div className="sb">{item.description}</div>
                                        </div>
                                        <Icon n="chevR" s={16} c="#94A3B8" />
                                    </div>
                                </Link>
                            );
                        })}
                        {filteredFeed.filter(i => i.severity === 'urgent').length === 0 && (
                            <div className="rm-empty">
                                <Icon n="checkc" s={32} c="#059669" />
                                <p>All clear! No items require your urgent attention.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    <button
                        onClick={() => { setView('user'); setFilter('all'); setLogWorkOpen(true); }}
                        title="Log work"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.5rem 0.875rem',
                            background: '#064e3b', color: '#ffffff',
                            border: 'none', borderRadius: '8px',
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <ClipboardList size={14} />
                        Log work
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
                            href="/briefs"
                        />
                        <StatCard
                            label="Hearings this week"
                            value={firmStats.hearingsThisWeek}
                            delta={`Next: ${firmStats.nextHearingLabel}`}
                            deltaType="neutral"
                            href="/calendar"
                        />
                    </>
                ) : (
                    <>
                        <StatCard
                            label="My briefs"
                            value={userStats.myBriefs}
                            delta={userStats.myBriefsSubLabel}
                            deltaType="neutral"
                            href="/briefs"
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
                            href="/calendar"
                        />
                    </>
                )}
            </div>

            {/* Feed Area */}
            <div className={styles.feedArea}>
                {view === 'firm' && (
                    <FirmWorkLogBoard
                        workspaceId={workspaceId}
                        currentUserId={userId}
                        isAdmin={isAdmin}
                        initialEntries={firmWorkLog}
                        teamMembers={teamMembers}
                        briefs={briefs}
                    />
                )}
                {view === 'user' && (
                    <DailyWorkLogPanel
                        workspaceId={workspaceId}
                        userId={userId}
                        initialEntries={todayEntries}
                        briefs={briefs}
                        teamMembers={teamMembers}
                        isAdmin={isAdmin}
                        openForm={logWorkOpen}
                        onFormOpened={() => setLogWorkOpen(false)}
                    />
                )}

                {view === 'user' && myBriefs.length > 0 && (
                    <MyBriefsGrid briefs={myBriefs} />
                )}

                {anomalies.length > 0 && (
                    <AnomalyPanel anomalies={anomalies} />
                )}
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
    href,
}: {
    label: string;
    value: number;
    delta: string;
    deltaType: 'up' | 'down' | 'neutral';
    urgent?: boolean;
    href?: string;
}) {
    const inner = (
        <>
            <div className={styles.statLabel}>{label}</div>
            <div className={`${styles.statVal} ${urgent ? styles.statValUrgent : ''}`}>{value}</div>
            <div className={`${styles.statDelta} ${deltaType === 'up' ? styles.deltaUp : deltaType === 'down' ? styles.deltaDown : styles.deltaNeutral}`}>
                {delta}
            </div>
        </>
    );
    if (href) {
        return (
            <Link href={href} className={styles.statCard} style={{ textDecoration: 'none' }}>
                {inner}
            </Link>
        );
    }
    return <div className={styles.statCard}>{inner}</div>;
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
