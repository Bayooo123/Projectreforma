import Link from 'next/link';
import { FileText, Clock, Scale } from 'lucide-react';
import type { MyBrief } from '@/app/actions/pulse';

interface Props {
    briefs: MyBrief[];
}

export default function MyBriefsGrid({ briefs }: Props) {
    if (briefs.length === 0) {
        return (
            <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                    <span style={sectionTitleStyle}>My Briefs</span>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                    No active briefs assigned to you yet.
                </p>
            </div>
        );
    }

    function formatDue(date: Date | null) {
        if (!date) return null;
        const d = new Date(date);
        const today = new Date();
        const days = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
        if (days < 0) return { label: `${Math.abs(days)}d overdue`, urgent: true };
        if (days === 0) return { label: 'Due today', urgent: true };
        if (days <= 3) return { label: `Due in ${days}d`, urgent: true };
        return { label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), urgent: false };
    }

    const ROLE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
        lead:      { bg: '#f0fdfa', color: '#0d9488', label: 'Lead' },
        creator:   { bg: '#eff6ff', color: '#2563eb', label: 'Creator' },
        assisting: { bg: '#f5f3ff', color: '#6d28d9', label: 'Assisting' },
    };

    return (
        <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
                <span style={sectionTitleStyle}>My Briefs</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{briefs.length} active</span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 8,
            }}>
                {briefs.map(b => {
                    const title = b.customTitle || b.name;
                    const ref = b.customBriefNumber || b.briefNumber;
                    const due = formatDue(b.dueDate);
                    const role = ROLE_COLORS[b.role] || ROLE_COLORS.assisting;

                    return (
                        <Link key={b.id} href={`/briefs/${b.id}`} style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 6 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={cardTitleStyle} title={title}>{title}</div>
                                    {b.client && (
                                        <div style={cardClientStyle}>{b.client.name}</div>
                                    )}
                                </div>
                                <span style={{ ...roleBadgeStyle, background: role.bg, color: role.color }}>
                                    {role.label}
                                </span>
                            </div>

                            {b.summary ? (
                                <p style={summaryStyle}>{b.summary.slice(0, 110)}{b.summary.length > 110 ? '…' : ''}</p>
                            ) : (
                                <p style={{ ...summaryStyle, color: '#cbd5e1', fontStyle: 'italic' }}>
                                    Summary not yet generated
                                </p>
                            )}

                            <div style={cardFooterStyle}>
                                <span style={metaItemStyle}>
                                    <FileText size={10} />
                                    {b.documentCount} doc{b.documentCount !== 1 ? 's' : ''}
                                </span>
                                <span style={metaItemStyle}>
                                    <Scale size={10} />
                                    {b.category}
                                </span>
                                {due && (
                                    <span style={{ ...metaItemStyle, color: due.urgent ? '#dc2626' : '#94a3b8', fontWeight: due.urgent ? 600 : 400 }}>
                                        <Clock size={10} />
                                        {due.label}
                                    </span>
                                )}
                            </div>

                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4 }}>{ref}</div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

const sectionStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 10,
};

const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.06em',
};

const cardStyle: React.CSSProperties = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 9,
    padding: '10px 12px',
    textDecoration: 'none',
    display: 'flex', flexDirection: 'column',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    cursor: 'pointer',
};

const cardTitleStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#1e293b',
    lineHeight: 1.35, overflow: 'hidden',
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
};

const cardClientStyle: React.CSSProperties = {
    fontSize: 10, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis',
};

const roleBadgeStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 600, padding: '2px 6px',
    borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
    textTransform: 'uppercase', letterSpacing: '0.04em',
};

const summaryStyle: React.CSSProperties = {
    fontSize: 10, color: '#64748b', lineHeight: 1.55,
    margin: '4px 0 6px', flex: 1,
};

const cardFooterStyle: React.CSSProperties = {
    display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
};

const metaItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 3,
    fontSize: 10, color: '#94a3b8',
};
