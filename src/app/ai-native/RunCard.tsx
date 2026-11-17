'use client';

import {
    PenLine, SpellCheck, FileText, CalendarClock, Receipt, Scale, Loader, BookMarked, FileSearch,
    Check, Minus, FolderPlus, Copy, Download, PencilLine, CircleAlert, SearchX, FileCheck2, type LucideIcon,
} from 'lucide-react';
import styles from './page.module.css';
import { AGENT_LABELS, type AgentKey, type RunView, type RunStepView } from './types';

const AGENT_ICON: Record<string, LucideIcon> = {
    first_draft: PenLine, proofread: SpellCheck, standard_document: FileText,
    deadline_watch: CalendarClock, ledger: Receipt, authority_search: Scale,
    brief_status: FileSearch, document_capture: FileCheck2, unclear: Loader, instruction: BookMarked,
};

function naira(n: number) {
    return `₦${n.toLocaleString('en-NG')}`;
}

export default function RunCard({
    run, briefName, showBriefLink, onOpenBrief, pending,
    draftText, onDraftTextChange, onApprove, onDiscard,
    onConfirmYes, onConfirmNo, busy,
    gapReply, onGapReplyChange, onGapSubmit,
}: {
    run: RunView;
    briefName: string | null;
    showBriefLink: boolean;
    onOpenBrief: (id: string) => void;
    pending: boolean;
    draftText: string;
    onDraftTextChange: (v: string) => void;
    onApprove: () => void;
    onDiscard: () => void;
    onConfirmYes: () => void;
    onConfirmNo: () => void;
    busy: boolean;
    gapReply: string;
    onGapReplyChange: (v: string) => void;
    onGapSubmit: () => void;
}) {
    const Icon = AGENT_ICON[run.agent] ?? Loader;
    const label = AGENT_LABELS[run.agent as AgentKey] ?? run.agent;
    const time = new Date(run.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const steps = run.steps ?? [];
    const approved = run.live?.status === 'approved' || run.live?.status === 'sent';
    const edited = !!run.live?.edited;
    const gapClosed = run.live?.gapStatus === 'closed';

    return (
        <article className={styles.run}>
            <span className={styles.runLine} />
            <span className={styles.runBubble} style={{
                background: pending ? 'var(--mint)' : 'var(--surface)',
                color: pending ? 'var(--green-deep)' : 'var(--text-body)',
            }}>
                <Icon size={15} />
            </span>
            <div className={styles.runBody}>
                <div className={styles.runHead}>
                    <div className={styles.runHeadLeft}>
                        <span className={styles.runLabel}>{label}</span>
                        {showBriefLink && run.briefId && briefName && (
                            <button type="button" className={styles.runBriefLink} onClick={() => onOpenBrief(run.briefId!)}>{briefName}</button>
                        )}
                        {run.reason && <span className={styles.runReason}>{run.reason}</span>}
                    </div>
                    <span className={styles.runTime}>{time}</span>
                </div>

                <div className={styles.runInput}>{run.input}</div>

                {steps.length > 0 && (
                    <div className={styles.steps}>
                        {steps.map(([label2, tone]: RunStepView, i: number) => {
                            const inProgress = label2.endsWith('…');
                            return (
                                <span key={i} className={`${styles.step} ${tone === 'live' ? styles.stepLive : styles.stepMuted}`}>
                                    {inProgress ? <Loader size={12} className={styles.spin} /> : tone === 'live' ? <Check size={12} /> : <Minus size={12} />}{label2}
                                </span>
                            );
                        })}
                    </div>
                )}

                {run.kind === 'confirm' && (
                    <div className={styles.confirmCard}>
                        <div className={styles.confirmHead}>
                            <span className={styles.confirmHeadIcon}><FolderPlus size={16} /></span>
                            <span>No brief on file for {run.payload?.caseTitle ? `“${run.payload.caseTitle}”` : 'this matter'}. Junior read these from your note.</span>
                        </div>
                        <div className={styles.factGrid}>
                            {[['Case', run.payload?.caseTitle], ['Court', run.payload?.court], ['Judge', run.payload?.judge], ['Adjourned to', run.payload?.adjournedTo]].map(([k, v]) => (
                                <div key={k} className={styles.factCell}>
                                    <span className={styles.factKey}>{k}</span>
                                    <span className={styles.factVal}>{v || 'Not stated'}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.confirmActions}>
                            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} disabled={busy} onClick={onConfirmNo}>Not now</button>
                            <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={busy} onClick={onConfirmYes}>Create brief and draft</button>
                        </div>
                    </div>
                )}

                {run.kind === 'draft' && (
                    <div className={styles.draftWrap}>
                        <div className={styles.draftFrame}>
                            <div className={styles.draftToolbar}>
                                <span className={styles.draftToolbarLeft}>
                                    <span style={{ color: 'var(--green-primary)', display: 'flex' }}><FileText size={15} /></span>
                                    <span>{run.payload?.title ?? 'Client update'}</span>
                                </span>
                                <span className={styles.draftToolbarIcons}>
                                    <span title="Copy" onClick={() => navigator.clipboard?.writeText(draftText)}><Copy size={14} /></span>
                                    <span title="Download"><Download size={14} /></span>
                                </span>
                            </div>
                            <div className={styles.draftPaperWrap}>
                                <div className={styles.draftPaper}>
                                    <div className={styles.letterhead}>
                                        <span className={styles.firmLine}>Chambers</span>
                                        <span className={styles.letterMeta}>
                                            <span>{new Date(run.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                            <span>Our ref: {briefName ? run.briefId : '—'}</span>
                                        </span>
                                    </div>
                                    <textarea
                                        className={styles.draftTextarea}
                                        value={draftText}
                                        readOnly={approved}
                                        onChange={e => onDraftTextChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        {!approved ? (
                            <div className={styles.draftFooter}>
                                <span className={styles.editNote}><PencilLine size={13} />Edit in place. Nothing is sent until you approve.</span>
                                <div className={styles.draftActions}>
                                    <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onDiscard}>Discard</button>
                                    <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={busy} onClick={onApprove}>Approve</button>
                                </div>
                            </div>
                        ) : (
                            <span className={styles.approvedNote}>
                                <span className={styles.approvedBadge}><Check size={12} /></span>
                                {edited ? 'Saved to the brief. Your edits are kept as training signal.' : 'Saved to the brief.'}
                            </span>
                        )}
                    </div>
                )}

                {run.kind === 'ledger' && (
                    <div className={styles.ledgerCard}>
                        {(run.payload?.items ?? []).map((it: { desc: string; cat: string; amt: number }, i: number) => (
                            <div key={i} className={styles.ledgerRow}>
                                <span className={styles.ledgerDesc}>
                                    <span>{it.desc}</span>
                                    <span className={styles.ledgerCat}>{it.cat}</span>
                                </span>
                                <span>{naira(it.amt)}</span>
                            </div>
                        ))}
                        <div className={styles.ledgerTotalRow}>
                            <span>Recorded</span><span>{naira(run.payload?.total ?? 0)}</span>
                        </div>
                    </div>
                )}

                {run.kind === 'document' && (
                    <div className={styles.gapCard}>
                        <div className={styles.gapHead}>
                            <span className={styles.confirmHeadIcon}><FileCheck2 size={16} /></span>
                            <span>
                                <div className={styles.gapTitle}>Filed to {run.payload?.briefName ?? 'the brief'}</div>
                                <div className={styles.gapText}>
                                    “{run.payload?.name ?? 'Document'}” ({run.payload?.docType ?? 'Other Document'}) — saved to the knowledge base, not just this conversation.
                                </div>
                            </span>
                        </div>
                    </div>
                )}

                {run.kind === 'text' && <div className={styles.textCard}>{run.payload?.text ?? run.input}</div>}

                {run.kind === 'error' && (
                    <div className={styles.errorCard}>
                        <span className={styles.errorIcon}><CircleAlert size={14} /></span>
                        <span>{run.payload?.text}</span>
                    </div>
                )}

                {run.kind === 'gap' && (
                    <div className={styles.gapCard}>
                        <div className={styles.gapHead}>
                            <span className={styles.gapHeadIcon}><SearchX size={16} /></span>
                            <span>
                                <div className={styles.gapTitle}>Not in the knowledge base</div>
                                <div className={styles.gapText}>{run.payload?.text ?? ''}</div>
                            </span>
                        </div>
                        {!gapClosed ? (
                            <div className={styles.gapReplyRow}>
                                <input
                                    placeholder={run.payload?.hint ?? 'Reply to answer'}
                                    value={gapReply}
                                    onChange={e => onGapReplyChange(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') onGapSubmit(); }}
                                />
                                <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={onGapSubmit}>Tell Junior</button>
                            </div>
                        ) : (
                            <div className={styles.gapClosed}>
                                <Check size={13} /><span>“{run.live?.answer}” — saved to the brief and used from now on.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
