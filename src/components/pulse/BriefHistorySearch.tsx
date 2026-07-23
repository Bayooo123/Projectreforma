'use client';

import { useState, useRef } from 'react';
import { Search, FileText, StickyNote, Clock, Gavel, Mail, CheckSquare, Bot, X } from 'lucide-react';
import { searchBriefHistory, type SearchResultItem, type SearchResultType } from '@/app/actions/brief-history-search';

const TYPE_ICON: Record<SearchResultType, React.ElementType> = {
    document: FileText,
    note: StickyNote,
    timeline: Clock,
    hearing: Gavel,
    correspondence: Mail,
    task: CheckSquare,
    conversation: Bot,
};

const TYPE_LABEL: Record<SearchResultType, string> = {
    document: 'Document',
    note: 'Note',
    timeline: 'Timeline',
    hearing: 'Court event',
    correspondence: 'Correspondence',
    task: 'Task',
    conversation: 'Conversation',
};

const TAB_FOR_TYPE: Partial<Record<SearchResultType, string>> = {
    document: 'timeline',
    timeline: 'timeline',
    hearing: 'timeline',
};

export default function BriefHistorySearch({ workspaceId }: { workspaceId: string }) {
    const [query, setQuery] = useState('');
    const [type, setType] = useState<SearchResultType | ''>('');
    const [participant, setParticipant] = useState('');
    const [results, setResults] = useState<SearchResultItem[] | null>(null);
    const [loading, setLoading] = useState(false);

    const runSearch = async (q: string, t: SearchResultType | '', p: string) => {
        if (q.trim().length < 2) { setResults(null); return; }
        setLoading(true);
        const found = await searchBriefHistory(workspaceId, q, {
            type: t || undefined,
            participant: p || undefined,
        });
        setResults(found);
        setLoading(false);
    };

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onQueryChange = (value: string) => {
        setQuery(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => runSearch(value, type, participant), 350);
    };

    const clear = () => { setQuery(''); setResults(null); };

    return (
        <div style={{ marginBottom: '1.25rem', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', borderBottom: results ? '1px solid #f3f4f6' : 'none' }}>
                <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
                <input
                    value={query}
                    onChange={e => onQueryChange(e.target.value)}
                    placeholder="Search every brief's documents, correspondence, court events, notes, and past conversations…"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.82rem', color: '#111827' }}
                />
                {query && (
                    <button onClick={clear} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {query.length >= 2 && (
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
                    <select
                        value={type}
                        onChange={e => { const t = e.target.value as SearchResultType | ''; setType(t); runSearch(query, t, participant); }}
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid #e5e7eb', color: '#374151' }}
                    >
                        <option value="">All types</option>
                        {(Object.keys(TYPE_LABEL) as SearchResultType[]).map(t => (
                            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                        ))}
                    </select>
                    <input
                        value={participant}
                        onChange={e => { setParticipant(e.target.value); runSearch(query, type, e.target.value); }}
                        placeholder="Filter by participant"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid #e5e7eb', color: '#374151', width: 160 }}
                    />
                </div>
            )}

            {loading && <p style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '0.6rem 0.75rem', margin: 0 }}>Searching…</p>}

            {!loading && results && (
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {results.length === 0 && (
                        <p style={{ fontSize: '0.78rem', color: '#9ca3af', padding: '0.75rem' }}>No matches across any brief&apos;s history.</p>
                    )}
                    {results.map(r => {
                        const Icon = TYPE_ICON[r.type];
                        const tab = TAB_FOR_TYPE[r.type];
                        return (
                            <a
                                key={r.id}
                                href={`/briefs/${r.briefId}${tab ? `?tab=${tab}` : ''}`}
                                style={{
                                    display: 'flex', gap: '0.6rem', padding: '0.6rem 0.75rem',
                                    borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: 'inherit',
                                }}
                            >
                                <Icon size={14} color="#0d9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>{r.title}</span>
                                        <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>· {r.briefName}</span>
                                        {r.participant && <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>· {r.participant}</span>}
                                        <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>· {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <p style={{ fontSize: '0.74rem', color: '#6b7280', margin: '0.15rem 0 0', lineHeight: 1.4 }}>{r.snippet}</p>
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
