'use client';

import { useState } from 'react';
import {
    classifyInput,
    executeAgent,
    identifyBriefForDraft,
    draftForMatchedBrief,
    confirmCreateBriefAndDraft,
    approveAiNativeDraft,
    getLedgerSummary,
} from '@/app/actions/ai-native';
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

interface ExtractedCaseFacts {
    caseTitle: string | null;
    court: string | null;
    judge: string | null;
    claimantName: string | null;
    proceedings: string;
    adjournedTo: string | null;
}

interface OtherResult {
    agent?: string;
    reason?: string;
    success?: true;
    title?: string;
    markdown?: string;
    error?: string;
}

interface DraftResult {
    draftId?: string;
    title?: string;
    markdown?: string;
    briefName?: string;
    briefCreated?: boolean;
    error?: string;
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
    ['Ledger', "Drop in today's expenses — they're recorded and ready for a spreadsheet."],
    ['Authority Search', 'Ask for case law for or against a fact.'],
];

function fmtNaira(n: number) {
    return `₦${n.toLocaleString()}`;
}

export default function AiNativeClient({ initialBriefs, initialLedger }: { initialBriefs: Brief[]; initialLedger: LedgerSummary }) {
    const [briefRef, setBriefRef] = useState('');
    const [input, setInput] = useState('');
    const [activeInput, setActiveInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [agent, setAgent] = useState<string | null>(null);
    const [pendingFacts, setPendingFacts] = useState<ExtractedCaseFacts | null>(null);
    const [draft, setDraft] = useState<DraftResult | null>(null);
    const [draftText, setDraftText] = useState('');
    const [approved, setApproved] = useState(false);
    const [otherResult, setOtherResult] = useState<OtherResult | null>(null);
    const [ledger, setLedger] = useState(initialLedger);

    const resetResultState = () => {
        setError(null);
        setAgent(null);
        setPendingFacts(null);
        setDraft(null);
        setDraftText('');
        setApproved(false);
        setOtherResult(null);
    };

    const refreshLedger = async () => setLedger(await getLedgerSummary());

    const finishDraft = (res: DraftResult) => {
        if (res.error || !res.draftId) {
            setError(res.error ?? 'Something went wrong preparing the draft.');
            setStatus(null);
            return;
        }
        setDraft(res);
        setDraftText(res.markdown ?? '');
        setStatus('Draft ready for your review.');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || busy) return;
        const text = input;
        setActiveInput(text);
        setInput('');
        setBusy(true);
        resetResultState();
        setStatus('Reviewing message…');

        const classified = await classifyInput(text);
        if ('error' in classified) {
            setError(classified.error as string);
            setStatus(null);
            setBusy(false);
            return;
        }
        setAgent(classified.agent);

        if (classified.agent === 'first_draft') {
            setStatus('Identifying brief…');
            const identified = await identifyBriefForDraft(text, briefRef);
            if (identified.status === 'matched') {
                setStatus('Preparing draft…');
                const res = await draftForMatchedBrief(text, identified.brief.id, identified.facts);
                finishDraft(res);
            } else {
                setPendingFacts(identified.facts);
                setStatus(null);
            }
        } else {
            setStatus(`Running ${AGENT_LABELS[classified.agent] ?? classified.agent}…`);
            const res: OtherResult = await executeAgent(classified.agent, text, briefRef);
            setOtherResult(res);
            if (res.agent === 'ledger' && res.success) await refreshLedger();
            setStatus(null);
        }
        setBusy(false);
    };

    const handleConfirm = async (yes: boolean) => {
        if (!yes || !pendingFacts) {
            setPendingFacts(null);
            setStatus(null);
            return;
        }
        setBusy(true);
        setStatus('Creating brief and preparing draft…');
        const res = await confirmCreateBriefAndDraft(activeInput, pendingFacts);
        setPendingFacts(null);
        finishDraft(res);
        setBusy(false);
    };

    const handleApprove = async () => {
        if (!draft?.draftId) return;
        setBusy(true);
        await approveAiNativeDraft(draft.draftId, draftText);
        setApproved(true);
        setBusy(false);
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
                <label className={styles.label} htmlFor="briefRef">Brief (optional — First Draft will find or create one if you leave this blank)</label>
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
                    {busy ? (status ?? 'Working…') : 'Send to Junior'}
                </button>
            </form>

            {status && !pendingFacts && !draft && (
                <div className={styles.resultCard}>
                    <span className={styles.resultBadge}>{AGENT_LABELS[agent ?? 'unclear'] ?? 'Junior'}</span>
                    <div className={styles.resultBody}>{status}</div>
                </div>
            )}

            {error && (
                <div className={styles.resultCard}>
                    <span className={`${styles.resultBadge} ${styles.resultError}`}>{AGENT_LABELS[agent ?? 'unclear'] ?? 'Junior'}</span>
                    <div className={styles.resultBody}>{error}</div>
                </div>
            )}

            {pendingFacts && (
                <div className={styles.resultCard}>
                    <span className={styles.resultBadge}>First Draft</span>
                    <div className={styles.resultBody}>
                        No existing brief found for {pendingFacts.caseTitle ? `“${pendingFacts.caseTitle}”` : 'this matter'}. Create one and continue?
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.9rem' }}>
                        <button className={styles.submit} type="button" disabled={busy} onClick={() => handleConfirm(true)}>
                            {busy ? 'Working…' : 'Yes, create it'}
                        </button>
                        <button className={styles.submit} type="button" disabled={busy} style={{ background: '#e4e1d3', color: '#122a23' }} onClick={() => handleConfirm(false)}>
                            No
                        </button>
                    </div>
                </div>
            )}

            {draft && (
                <div className={styles.resultCard}>
                    <span className={styles.resultBadge}>First Draft</span>
                    <div className={styles.empty}>
                        {draft.briefCreated ? `New brief created: ${draft.briefName}` : draft.briefName ? `Matter: ${draft.briefName}` : null}
                        {' — '}{status}
                    </div>
                    <textarea
                        className={styles.textarea}
                        style={{ minHeight: '220px', marginTop: '0.6rem' }}
                        value={draftText}
                        onChange={e => setDraftText(e.target.value)}
                        disabled={approved}
                    />
                    {!approved ? (
                        <button className={styles.submit} type="button" disabled={busy} style={{ marginTop: '0.75rem' }} onClick={handleApprove}>
                            {busy ? 'Saving…' : 'Approve'}
                        </button>
                    ) : (
                        <div className={styles.empty} style={{ marginTop: '0.75rem' }}>
                            Approved — any edit you made here is the training signal the next fine-tuning run will learn from.
                        </div>
                    )}
                </div>
            )}

            {otherResult && (
                <div className={styles.resultCard}>
                    <span className={`${styles.resultBadge} ${otherResult.error ? styles.resultError : ''}`}>
                        {AGENT_LABELS[otherResult.agent ?? 'unclear'] ?? 'Junior'}
                    </span>
                    <div className={styles.resultBody}>{otherResult.error ?? otherResult.markdown}</div>
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
