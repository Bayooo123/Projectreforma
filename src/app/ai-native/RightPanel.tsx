'use client';

import { useState } from 'react';
import { Database, RefreshCw, FolderOpen, Landmark, Mail, Library, BookMarked, Plus, Download } from 'lucide-react';
import styles from './page.module.css';
import type { KnowledgeStatus, GapView, InstructionView, LedgerSummary } from './types';

const SOURCE_ICONS = [FolderOpen, Landmark, Mail, Library];

function naira(n: number) {
    return `₦${n.toLocaleString('en-NG')}`;
}

export default function RightPanel({
    docked, tab, onTab, knowledge, gaps, instructions, ledger, onRunNow, runningPass,
    onResolveGap, onAddInstruction,
}: {
    docked: boolean;
    tab: 'knowledge' | 'ledger';
    onTab: (t: 'knowledge' | 'ledger') => void;
    knowledge: KnowledgeStatus;
    gaps: GapView[];
    instructions: InstructionView[];
    ledger: LedgerSummary;
    onRunNow: () => void;
    runningPass: boolean;
    onResolveGap: (gapId: string, answer: string) => void;
    onAddInstruction: () => void;
}) {
    const [replies, setReplies] = useState<Record<string, string>>({});

    return (
        <aside className={`${styles.panel} ${docked ? styles.panelDocked : styles.panelOverlay}`}>
            <div className={styles.panelTabs}>
                <div className={styles.panelTabGroup}>
                    <button type="button" className={`${styles.panelTab} ${tab === 'knowledge' ? styles.panelTabActive : ''}`} onClick={() => onTab('knowledge')}>Knowledge</button>
                    <button type="button" className={`${styles.panelTab} ${tab === 'ledger' ? styles.panelTabActive : ''}`} onClick={() => onTab('ledger')}>Ledger</button>
                </div>
            </div>

            <div className={styles.panelScroll}>
                {tab === 'knowledge' ? (
                    <>
                        <div className={styles.kbStatusCard}>
                            <div className={styles.kbStatusTop}>
                                <div className={styles.kbStatusHeadRow}>
                                    <span className={styles.kbStatusHead}>
                                        <span style={{ color: 'var(--green-primary)', display: 'flex' }}><Database size={14} /></span>
                                        {runningPass ? 'Checking…' : 'Knowledge base'}
                                    </span>
                                    <button type="button" className={styles.runNowBtn} disabled={runningPass} onClick={onRunNow}>
                                        <RefreshCw size={12} />Run now
                                    </button>
                                </div>
                                <span className={styles.kbBar}><span className={styles.kbBarFill} style={{ width: runningPass ? '60%' : '100%' }} /></span>
                                <div className={styles.kbStatusCaption}>
                                    Run now checks every active matter for a missing next date, a matter that&apos;s gone quiet, or a client update still waiting on your review. {knowledge.openGapCount} open right now.
                                </div>
                            </div>
                            <div className={styles.sourcesList}>
                                {knowledge.sources.map((s, i) => {
                                    const Icon = SOURCE_ICONS[i] ?? FolderOpen;
                                    return (
                                        <div key={s.name} className={styles.sourceRow}>
                                            <Icon size={14} style={{ color: 'var(--text-muted)' }} />
                                            <span className={styles.sourceName}>{s.name}</span>
                                            <span className={styles.sourceCount}>{s.count.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={styles.panelList}>
                            <div className={styles.panelSectionHead}>
                                <span className={styles.panelSectionTitle}>For your attention</span>
                                <span className={styles.panelSectionCount}>{gaps.length ? `${gaps.length} open` : ''}</span>
                            </div>
                            {gaps.length === 0 ? (
                                <div className={styles.panelEmpty}>Nothing waiting on you.</div>
                            ) : gaps.map(g => (
                                <div key={g.id} className={styles.gapPanelCard}>
                                    <div className={styles.gapPanelBody}>
                                        <span className={styles.gapPanelBrief}>{g.brief?.name ?? ''}</span>
                                        <span className={styles.gapPanelText}>{g.text}</span>
                                    </div>
                                    <div className={styles.gapPanelReply}>
                                        <input
                                            placeholder={g.hint ?? 'Reply to answer'}
                                            value={replies[g.id] ?? ''}
                                            onChange={e => setReplies(r => ({ ...r, [g.id]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter') onResolveGap(g.id, replies[g.id] ?? ''); }}
                                        />
                                        <button type="button" className={styles.gapAddBtn} onClick={() => onResolveGap(g.id, replies[g.id] ?? '')}>Reply</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.panelList}>
                            <div className={styles.panelSectionHead}>
                                <span className={styles.panelSectionTitle}>Instructions</span>
                                <button type="button" className={styles.addInstructionBtn} onClick={onAddInstruction}>
                                    <Plus size={12} />Add
                                </button>
                            </div>
                            <div className={styles.instructionsCard}>
                                {instructions.map((i, n) => (
                                    <div key={i.id} className={`${styles.instructionRow} ${n ? styles.instructionDivider : ''}`}>
                                        <span className={styles.instructionIcon}><BookMarked size={13} /></span>
                                        <span>
                                            <div className={styles.instructionText}>{i.text}</div>
                                            <div className={styles.instructionMeta}>
                                                {i.brief?.name ?? 'Firm-wide'} · {new Date(i.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.ledgerPanelTotalCard}>
                            <div className={styles.ledgerPanelCaption}>Last {ledger.entries.length} entries</div>
                            <div className={styles.ledgerPanelTotal}>{naira(ledger.total)}</div>
                            <a className={styles.ledgerPanelDownload} href="/api/ai-native/ledger/export">
                                <Download size={13} />Download spreadsheet
                            </a>
                        </div>
                        <div className={styles.ledgerPanelList}>
                            {ledger.entries.map((e, n) => (
                                <div key={e.id} className={`${styles.ledgerPanelRow} ${n ? styles.ledgerPanelRowDivider : ''}`}>
                                    <span>
                                        <div className={styles.ledgerPanelDesc}>{e.description}</div>
                                        <div className={styles.ledgerPanelMeta}>{new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {e.category}</div>
                                    </span>
                                    <span className={styles.ledgerPanelAmt}>{naira(e.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
}
