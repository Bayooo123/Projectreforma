'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Loader2 } from 'lucide-react';
import styles from './papers.module.css';

type Phase = { text?: string };
type PaperData = { topic?: string; kind?: string; phases?: Phase[] };
type PaperRow = { id: string; data: PaperData; updatedAt: string };

const KIND_ORDER = ['Journal article', 'Undergraduate project', 'Monograph', 'Conference paper'];

function words(t: string): number {
    return (t.trim().match(/\S+/g) || []).length;
}

function kindRank(kind: string): number {
    const i = KIND_ORDER.indexOf(kind);
    return i === -1 ? KIND_ORDER.length : i;
}

export default function PapersList({ userName }: { userName: string | null }) {
    const [papers, setPapers] = useState<PaperRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('All');

    useEffect(() => {
        fetch('/api/ojogbon/papers', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(j => setPapers(j.papers ?? []))
            .catch(() => setError('Couldn’t load your papers. Try refreshing.'));
    }, []);

    const kinds = useMemo(() => {
        if (!papers) return [];
        const set = new Set(papers.map(p => p.data?.kind || 'Unspecified'));
        return [...set].sort((a, b) => kindRank(a) - kindRank(b));
    }, [papers]);

    const grouped = useMemo(() => {
        if (!papers) return [];
        const byKind = new Map<string, PaperRow[]>();
        for (const p of papers) {
            const kind = p.data?.kind || 'Unspecified';
            if (filter !== 'All' && kind !== filter) continue;
            if (!byKind.has(kind)) byKind.set(kind, []);
            byKind.get(kind)!.push(p);
        }
        return [...byKind.entries()]
            .sort(([a], [b]) => kindRank(a) - kindRank(b))
            .map(([kind, rows]) => [kind, rows.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))] as const);
    }, [papers, filter]);

    return (
        <div className={styles.page}>
            <header className={styles.top}>
                <Link href="/ojogbon" className={styles.wordmark}>
                    Ojogbon
                </Link>
                <nav className={styles.nav}>
                    {userName && <span className={styles.who}>{userName}</span>}
                    <Link href="/ojogbon/app" className={styles.btnPrimary}>
                        Open studio <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </nav>
            </header>

            <main className={styles.main}>
                <div className={styles.heading}>
                    <p className={styles.eyebrow}>Your work</p>
                    <h1 className={styles.h1}>My papers</h1>
                </div>

                {papers && papers.length > 0 && (
                    <div className={styles.tabs} role="tablist" aria-label="Filter by kind">
                        <button className={filter === 'All' ? styles.tabOn : styles.tab} onClick={() => setFilter('All')}>
                            All ({papers.length})
                        </button>
                        {kinds.map(k => (
                            <button key={k} className={filter === k ? styles.tabOn : styles.tab} onClick={() => setFilter(k)}>
                                {k}
                            </button>
                        ))}
                    </div>
                )}

                {error && <p className={styles.err}>{error}</p>}

                {!papers && !error && (
                    <p className={styles.empty}>
                        <Loader2 className={styles.spin} size={18} aria-hidden="true" /> Loading your papers…
                    </p>
                )}

                {papers && papers.length === 0 && (
                    <div className={styles.emptyCard}>
                        <FileText size={28} aria-hidden="true" />
                        <p>You haven’t started a paper yet.</p>
                        <Link href="/ojogbon/app" className={styles.btnPrimary}>
                            Start your first paper <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    </div>
                )}

                {grouped.map(([kind, rows]) => (
                    <section key={kind} className={styles.group}>
                        <h2 className={styles.groupTitle}>
                            {kind} <span className={styles.count}>{rows.length}</span>
                        </h2>
                        <div className={styles.cards}>
                            {rows.map(row => {
                                const phases = row.data?.phases ?? [];
                                const done = phases.filter(p => (p.text || '').trim()).length;
                                const wc = phases.reduce((a, p) => a + words(p.text || ''), 0);
                                return (
                                    <Link key={row.id} href={`/ojogbon/app?paper=${encodeURIComponent(row.id)}`} className={styles.card}>
                                        <h3>{row.data?.topic || 'Untitled paper'}</h3>
                                        <p className={styles.meta}>
                                            {phases.length ? `${done} of ${phases.length} phases drafted` : 'Not yet started'} · {wc.toLocaleString()} words
                                        </p>
                                        <p className={styles.updated}>Updated {new Date(row.updatedAt).toLocaleDateString()}</p>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
}
