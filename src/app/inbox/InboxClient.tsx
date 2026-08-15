'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Inbox, Mail, MessageCircle, Upload, FileText, Check, Loader } from 'lucide-react';
import { getInboxAttachments, confirmInboxAttachment, type InboxAttachmentRow } from '@/app/actions/inbox';
import { getBriefsForPicker } from '@/app/actions/briefs';
import BulkUploadDropzone from '@/components/inbox/BulkUploadDropzone';

interface BriefOption {
    id: string;
    name: string;
    briefNumber: string;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
        ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const SOURCE_STYLE: Record<string, { bg: string; text: string; label: string; Icon: typeof Mail }> = {
    whatsapp: { bg: '#ecfdf5', text: '#047857', label: 'WhatsApp', Icon: MessageCircle },
    upload:   { bg: '#fef3c7', text: '#92400e', label: 'Uploaded', Icon: Upload },
    email:    { bg: '#eff6ff', text: '#1e40af', label: 'Email', Icon: Mail },
};

function SourceBadge({ source }: { source: string }) {
    const s = SOURCE_STYLE[source] ?? SOURCE_STYLE.email;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
            padding: '2px 8px', borderRadius: 999,
            background: s.bg, color: s.text,
        }}>
            <s.Icon size={10} />
            {s.label}
        </span>
    );
}

function InboxRow({
    item,
    briefs,
    onFiled,
}: {
    item: InboxAttachmentRow;
    briefs: BriefOption[] | null;
    onFiled: (id: string, briefName: string) => void;
}) {
    const [selectedBriefId, setSelectedBriefId] = useState(item.suggestedBriefId ?? '');
    const [filing, setFiling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const file = async () => {
        if (!selectedBriefId) {
            setError('Select a brief first');
            return;
        }
        setFiling(true);
        setError(null);
        try {
            const result = await confirmInboxAttachment(item.id, selectedBriefId);
            if (result.success) {
                onFiled(item.id, result.briefName || '');
            } else {
                setError(result.error || 'Could not file this item');
            }
        } catch {
            setError('Could not file this item');
        } finally {
            setFiling(false);
        }
    };

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'minmax(200px, 1.4fr) 1fr 1.2fr minmax(180px, 0.9fr)',
            borderBottom: '1px solid #f3f4f6', alignItems: 'center',
        }}>
            <div style={{ padding: '0.65rem 0.75rem', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 4 }}>
                    <SourceBadge source={item.source} />
                </div>
                <a
                    href={item.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: '#111827', textDecoration: 'none' }}
                >
                    <FileText size={13} color="#6b7280" />
                    {item.fileName}
                </a>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 2 }}>
                    {formatSize(item.size)} · {formatDate(item.createdAt)}
                </div>
            </div>

            <div style={{ padding: '0.5rem 0.6rem', borderLeft: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '0.78rem', color: '#111827', fontWeight: 500 }}>{item.senderLabel}</div>
                {item.caption && (
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2, fontStyle: 'italic' }}>
                        &ldquo;{item.caption}&rdquo;
                    </div>
                )}
            </div>

            <div style={{ padding: '0.5rem 0.6rem', borderLeft: '1px solid #f3f4f6' }}>
                {item.status === 'filed' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
                        <Check size={13} /> Filed under {item.confirmedBriefName}
                    </div>
                ) : (
                    <>
                        <select
                            value={selectedBriefId}
                            onChange={e => setSelectedBriefId(e.target.value)}
                            style={{
                                width: '100%', fontSize: '0.76rem', padding: '0.35rem 0.5rem', borderRadius: 6,
                                border: '1px solid #e5e7eb', color: '#111827', background: '#fff',
                            }}
                        >
                            <option value="">Select a brief…</option>
                            {briefs?.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.briefNumber})</option>
                            ))}
                        </select>
                        {item.suggestedBriefName && (
                            <div style={{ fontSize: '0.66rem', color: '#9ca3af', marginTop: 3 }}>
                                AI guess: {item.suggestedBriefName}
                                {item.suggestedConfidence != null ? ` (${Math.round(item.suggestedConfidence * 100)}%)` : ''}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div style={{ padding: '0.5rem 0.6rem', borderLeft: '1px solid #f3f4f6' }}>
                {item.status === 'pending' && (
                    <>
                        <button
                            onClick={file}
                            disabled={filing || !selectedBriefId}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center',
                                padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', width: '100%',
                                background: !selectedBriefId ? '#f3f4f6' : '#0d9488',
                                color: !selectedBriefId ? '#9ca3af' : '#fff',
                                fontSize: '0.75rem', fontWeight: 600,
                                cursor: selectedBriefId && !filing ? 'pointer' : 'default',
                            }}
                        >
                            {filing ? <Loader size={12} className="rm-spin" /> : <Check size={12} />}
                            {filing ? 'Filing…' : 'File'}
                        </button>
                        {error && <div style={{ fontSize: '0.66rem', color: '#b91c1c', marginTop: 4 }}>{error}</div>}
                    </>
                )}
                {item.status === 'filed' && item.filedAt && (
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{formatDate(item.filedAt)}</div>
                )}
            </div>
        </div>
    );
}

export default function InboxClient({ workspaceId }: { workspaceId: string }) {
    const [tab, setTab] = useState<'pending' | 'filed'>('pending');
    const [items, setItems] = useState<InboxAttachmentRow[] | null>(null);
    const [briefs, setBriefs] = useState<BriefOption[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [list, briefList] = await Promise.all([
                getInboxAttachments(workspaceId, tab),
                getBriefsForPicker(workspaceId),
            ]);
            setItems(list);
            setBriefs(briefList.map(b => ({ id: b.id, name: b.name, briefNumber: b.briefNumber })));
        } catch {
            setLoadError('Could not load the inbox — please try again.');
        } finally {
            setLoading(false);
        }
    }, [workspaceId, tab]);

    // Standard fetch-on-mount/on-tab-change pattern; setState inside load() is intentional.
    useEffect(() => { load(); }, [load]);

    const handleFiled = (id: string, briefName: string) => {
        if (tab === 'pending') {
            setItems(prev => prev?.filter(i => i.id !== id) ?? prev);
        } else {
            setItems(prev => prev?.map(i => i.id === id ? { ...i, status: 'filed', confirmedBriefName: briefName } : i) ?? prev);
        }
    };

    const filtered = useMemo(() => {
        if (!items) return [];
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(i =>
            i.fileName.toLowerCase().includes(q) ||
            i.senderLabel.toLowerCase().includes(q) ||
            (i.caption ?? '').toLowerCase().includes(q)
        );
    }, [items, query]);

    return (
        <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Inbox size={20} color="#0d9488" />
                    <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: 0 }}>Inbox</h1>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>— documents from email, WhatsApp &amp; direct upload, one place</span>
                </div>
                <div style={{ position: 'relative' }}>
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search filename, sender…"
                        style={{
                            fontSize: '0.78rem', padding: '0.45rem 0.7rem', borderRadius: 6,
                            border: '1px solid #e5e7eb', outline: 'none', width: 220,
                        }}
                    />
                </div>
            </div>

            {tab === 'pending' && <BulkUploadDropzone workspaceId={workspaceId} onUploaded={load} />}

            <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', width: 'fit-content', marginBottom: '1rem' }}>
                {(['pending', 'filed'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            padding: '0.4rem 1.1rem', fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: tab === t ? '#0d9488' : '#fff', color: tab === t ? '#fff' : '#374151',
                        }}
                    >
                        {t === 'pending' ? 'Awaiting confirmation' : 'Filed'}
                    </button>
                ))}
            </div>

            {loading && <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Loading…</p>}
            {!loading && loadError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: 0 }}>{loadError}</p>
                    <button
                        onClick={load}
                        style={{
                            padding: '0.3rem 0.8rem', borderRadius: 6, border: '1px solid #e5e7eb',
                            background: '#fff', color: '#374151', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}
            {!loading && !loadError && filtered.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {tab === 'pending' ? 'Nothing waiting on confirmation.' : 'Nothing filed yet.'}
                </p>
            )}

            {!loading && !loadError && filtered.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'minmax(200px, 1.4fr) 1fr 1.2fr minmax(180px, 0.9fr)',
                        background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
                    }}>
                        {['Document', 'From', tab === 'pending' ? 'Assign to brief' : 'Filed under', ''].map((h, i) => (
                            <div key={i} style={{ padding: '0.55rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                {h}
                            </div>
                        ))}
                    </div>
                    {filtered.map(item => (
                        <InboxRow key={item.id} item={item} briefs={briefs} onFiled={handleFiled} />
                    ))}
                </div>
            )}
        </div>
    );
}
