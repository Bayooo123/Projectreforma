'use client';

import { useState } from 'react';
import { runJunior } from '@/app/actions/ai-native';
import styles from './page.module.css';

interface Brief {
    id: string;
    name: string;
    briefNumber: string;
    matter: { name: string } | null;
}

interface LedgerEntry {
    id: string;
    description: string | null;
    amount: number;
    category: string;
    date: string;
}

interface LedgerSummary {
    total: number;
    entries: LedgerEntry[];
}

const AGENT_LABELS: Record<string, string> = {
    first_draft: 'First Draft',
    proofread: 'Proofread',
    standard_document: 'Standard Documents',
    deadline_watch: 'Deadline Watch',
    ledger: 'Ledger',
    authority_search: 'Authority Search',
    unclear: 'Junior',
};

const AGENT_DESCRIPTIONS: [string, string][] = [
    ['First Draft', 'Report what happened in court — get a client-update letter.'],
    ['Proofread', 'Paste a filing — get a structural check before it goes to court.'],
    ['Standard Documents', 'Name a document type — CTC, search, deed, tenancy — filled from the brief.'],
    ['Deadline Watch', "Ask what's next for a matter."],
    ['Ledger', 'Drop in today\'s expenses — they\'re recorded and ready for a spreadsheet.'],
    ['Authority Search', 'Ask for case law for or against a fact.'],
];

function fmtNaira(n: number) {
    return `₦${n.toLocaleString()}`;
}

interface JuniorResult {
    agent?: string;
    reason?: string;
    briefName?: string | null;
    success?: true;
    title?: string;
    markdown?: string;
    error?: string;
}

export default function AiNativeClient({ initialBriefs, initialLedger }: { initialBriefs: Brief[]; initialLedger: LedgerSummary }) {
    const [briefRef, setBriefRef] = useState('');
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<JuniorResult | null>(null);
    const [ledger, setLedger] = useState(initialLedger);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || busy) return;
        setBusy(true);
        setResult(null);
        const res: JuniorResult = await runJunior(input, briefRef);
        setResult(res);
        setBusy(false);
        if (res.agent === 'ledger' && res.success) {
            const { getLedgerSummary } = await import('@/app/actions/ai-native');
            setLedger(await getLedgerSummary());
        }
        setInput('');
    };

    return (
        <div className={styles.page}>
            <div className={styles.eyebrow}>AI-native Reforma</div>
            <h1 className={styles.title}>Junior</h1>
            <p className={styles.lead}>
                Everything lands here first. Junior reads it, decides what it is, and hands it to the specialist
                built for the job — acting on real matters and real data, not a demo.
            </p>

            <div className={styles.agentLegend}>
                {AGENT_DESCRIPTIONS.map(([name, desc]) => (
                    <div key={name} className={styles.agentCard}>
                        <h4>{name}</h4>
                        <p>{desc}</p>
                    </div>
                ))}
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.label} htmlFor="briefRef">Brief (optional — needed for First Draft, Standard Documents, Deadline Watch)</label>
                <input
                    id="briefRef"
                    className={styles.input}
                    list="brief-options"
                    placeholder="Type a brief name or number..."
                    value={briefRef}
                    onChange={e => setBriefRef(e.target.value)}
                />
                <datalist id="brief-options">
                    {initialBriefs.map(b => (
                        <option key={b.id} value={b.name}>{b.briefNumber}{b.matter ? ` · ${b.matter.name}` : ''}</option>
                    ))}
                </datalist>

                <label className={styles.label} htmlFor="input">What&apos;s happening?</label>
                <textarea
                    id="input"
                    className={styles.textarea}
                    placeholder='e.g. "Matter came up today before Justice Sunmonu... adjourned to 23 November" or "fuel 5000, filing fees 15000"'
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />

                <button className={styles.submit} type="submit" disabled={busy}>
                    {busy ? 'Junior is reading this…' : 'Send to Junior'}
                </button>
            </form>

            {result && (
                <div className={styles.resultCard}>
                    <span className={`${styles.resultBadge} ${result.error ? styles.resultError : ''}`}>
                        {AGENT_LABELS[result.agent ?? 'unclear'] ?? 'Junior'}
                    </span>
                    {result.reason && <div className={styles.empty}>{result.reason}</div>}
                    <div className={styles.resultBody}>
                        {result.error ?? result.markdown}
                    </div>
                </div>
            )}

            <div className={styles.ledgerSection}>
                <div className={styles.ledgerHeader}>
                    <div className={styles.ledgerTotal}>Ledger — {fmtNaira(ledger.total)} recorded (last 20)</div>
                    <a className={styles.exportLink} href="/api/ai-native/ledger/export">Download spreadsheet</a>
                </div>
                {ledger.entries.length === 0 ? (
                    <p className={styles.empty}>Nothing recorded yet — drop an expense into the box above.</p>
                ) : (
                    <table className={styles.ledgerTable}>
                        <thead>
                            <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
                        </thead>
                        <tbody>
                            {ledger.entries.map(e => (
                                <tr key={e.id}>
                                    <td>{new Date(e.date).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</td>
                                    <td>{e.description}</td>
                                    <td>{e.category}</td>
                                    <td>{fmtNaira(e.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
