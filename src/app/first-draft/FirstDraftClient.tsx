'use client';

import { useState } from 'react';
import { FileEdit, Send, Trash2, Loader } from 'lucide-react';
import { sendDraft, discardDraft } from '@/app/actions/first-draft';
import styles from './page.module.css';

interface Draft {
    id: string;
    draftText: string;
    createdAt: string;
    matter: { name: string; client: { name: string; email: string } | null };
    calendarEntry: { date: string; proceedings: string | null; outcome: string | null };
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FirstDraftClient({ initialDrafts }: { initialDrafts: Draft[] }) {
    const [drafts, setDrafts] = useState(initialDrafts);
    const [editedText, setEditedText] = useState<Record<string, string>>({});
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<Record<string, string>>({});

    const textFor = (d: Draft) => editedText[d.id] ?? d.draftText;

    const handleSend = async (d: Draft) => {
        setBusyId(d.id);
        setError(prev => ({ ...prev, [d.id]: '' }));
        const result = await sendDraft(d.id, textFor(d));
        setBusyId(null);
        if (!result.success) {
            setError(prev => ({ ...prev, [d.id]: result.error || 'Failed to send' }));
            return;
        }
        setDrafts(prev => prev.filter(x => x.id !== d.id));
    };

    const handleDiscard = async (d: Draft) => {
        setBusyId(d.id);
        await discardDraft(d.id);
        setBusyId(null);
        setDrafts(prev => prev.filter(x => x.id !== d.id));
    };

    if (drafts.length === 0) {
        return (
            <div className={styles.page}>
                <div className={styles.icon}>
                    <FileEdit size={28} />
                </div>
                <h1 className={styles.title}>First Draft</h1>
                <p className={styles.lead}>
                    When a court attendance is logged against a matter, First Draft will assemble what happened,
                    the next date, and what the client was last told, then prepare a client update here for
                    review and send.
                </p>
                <div className={styles.status}>Nothing waiting for review right now.</div>
            </div>
        );
    }

    return (
        <div className={styles.listPage}>
            <h1 className={styles.listTitle}>First Draft</h1>
            <p className={styles.listSubtitle}>Client updates ready for review — nothing here has been sent.</p>

            {drafts.map(d => (
                <div key={d.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div>
                            <div className={styles.cardMatter}>{d.matter.name}</div>
                            <div className={styles.cardMeta}>
                                Court attendance on {fmtDate(d.calendarEntry.date)}
                                {d.matter.client ? ` · to ${d.matter.client.name} (${d.matter.client.email})` : ' · no client email on file'}
                            </div>
                        </div>
                    </div>

                    <textarea
                        className={styles.cardTextarea}
                        value={textFor(d)}
                        onChange={e => setEditedText(prev => ({ ...prev, [d.id]: e.target.value }))}
                        rows={8}
                    />

                    {error[d.id] && <div className={styles.cardError}>{error[d.id]}</div>}

                    <div className={styles.cardActions}>
                        <button
                            className={styles.discardBtn}
                            onClick={() => handleDiscard(d)}
                            disabled={busyId === d.id}
                        >
                            <Trash2 size={14} /> Discard
                        </button>
                        <button
                            className={styles.sendBtn}
                            onClick={() => handleSend(d)}
                            disabled={busyId === d.id || !d.matter.client}
                        >
                            {busyId === d.id ? <Loader size={14} className={styles.spin} /> : <Send size={14} />}
                            Send to client
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
