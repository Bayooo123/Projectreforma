'use client';

import { useEffect, useRef, useState } from 'react';
import { PanelLeft, PanelRight, ChevronRight, Database, Download } from 'lucide-react';
import styles from './page.module.css';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import Composer from './Composer';
import RunCard from './RunCard';
import { AGENT_LABELS, type AgentKey, type BriefSummary, type RunView, type GapView, type InstructionView, type LedgerSummary, type KnowledgeStatus } from './types';

function naira(n: number) {
    return `₦${n.toLocaleString('en-NG')}`;
}
import {
    classifyInput, executeAgent, identifyBriefForDraft, draftForMatchedBrief, confirmCreateBriefAndDraft,
    dismissConfirm, approveAiNativeDraft, discardAiNativeDraft, addInstructionAction, resolveGapAction,
    listRunsAction, listOpenGapsAction, listInstructionsAction, getKnowledgeStatusAction, runKnowledgePassAction,
    listBriefsWithStatus, getLedgerSummary,
} from '@/app/actions/ai-native';
import type { PracticeFocus } from '@/app/actions/reforma-x';

const PRACTICE_FOCUS_LABELS: Record<PracticeFocus, string> = {
    LITIGATION_HEAVY: 'litigation-heavy practice',
    ACADEMIC_CAPACITY_BUILDING: 'academic work and capacity building',
    CORPORATE_ADVISORY: 'corporate client advisory',
};

function isPendingRun(r: RunView): boolean {
    if (r.kind === 'confirm') return true;
    if (r.kind === 'draft') return r.live?.status !== 'approved' && r.live?.status !== 'sent';
    if (r.kind === 'gap') return r.live?.gapStatus !== 'closed';
    return false;
}

export default function AiNativeClient({
    initialBriefs, initialRuns, initialGaps, initialInstructions, initialLedger, initialKnowledge, practiceFocus,
}: {
    initialBriefs: BriefSummary[];
    initialRuns: RunView[];
    initialGaps: GapView[];
    initialInstructions: InstructionView[];
    initialLedger: LedgerSummary;
    initialKnowledge: KnowledgeStatus;
    practiceFocus: PracticeFocus | null;
}) {
    const [w, setW] = useState(1440);
    const [sideOpen, setSideOpen] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<AgentKey | null>(null);
    const [mode, setMode] = useState<'ask' | 'instruct'>('ask');
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [workingLabel, setWorkingLabel] = useState<string | null>(null);
    const [runningPass, setRunningPass] = useState(false);

    const [briefs, setBriefs] = useState(initialBriefs);
    const [runs, setRuns] = useState(initialRuns);
    const [gaps, setGaps] = useState(initialGaps);
    const [instructions, setInstructions] = useState(initialInstructions);
    const [ledger, setLedger] = useState(initialLedger);
    const [knowledge, setKnowledge] = useState(initialKnowledge);

    const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
    const [gapReplies, setGapReplies] = useState<Record<string, string>>({});
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const onResize = () => setW(window.innerWidth);
        window.addEventListener('resize', onResize);
        onResize();
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const sideDocked = w >= 900;
    const panelDocked = w >= 1200;
    const showSidebar = sideDocked || sideOpen;
    const showPanel = panelDocked || panelOpen;
    const scrim = (!sideDocked && sideOpen) || (!panelDocked && panelOpen);

    const selectedBrief = selectedId ? briefs.find(b => b.id === selectedId) ?? null : null;
    const visibleRuns = selectedId ? runs.filter(r => r.briefId === selectedId)
        : selectedAgent ? runs.filter(r => r.agent === selectedAgent)
        : runs;
    const scopedGaps = selectedId ? gaps.filter(g => g.briefId === selectedId) : gaps;
    const scopedInstructions = selectedId ? instructions.filter(i => i.briefId === selectedId || !i.briefId) : instructions;
    const reviewCount = briefs.filter(b => b.pending).length;

    async function refreshAll() {
        const [b, r, g, i, l, k] = await Promise.all([
            listBriefsWithStatus(), listRunsAction(null), listOpenGapsAction(null),
            listInstructionsAction(null), getLedgerSummary(), getKnowledgeStatusAction(),
        ]);
        setBriefs(b as BriefSummary[]);
        setRuns(r as unknown as RunView[]);
        setGaps(g as GapView[]);
        setInstructions(i as InstructionView[]);
        setLedger(l);
        setKnowledge(k);
    }

    function selectBrief(id: string | null) {
        setSelectedId(id);
        setSelectedAgent(null);
        setSideOpen(false);
    }

    function selectAgent(agent: AgentKey | null) {
        setSelectedAgent(agent);
        setSelectedId(null);
        setSideOpen(false);
    }

    async function handleSend() {
        const text = input.trim();
        if (!text || busy) return;
        setInput('');

        if (mode === 'instruct') {
            setBusy(true);
            await addInstructionAction(text, selectedId);
            await refreshAll();
            setBusy(false);
            return;
        }

        setBusy(true);
        setWorkingLabel('Reviewing message…');
        const briefRef = selectedBrief?.name ?? '';

        const classified = await classifyInput(text);
        if ('error' in classified) { setBusy(false); setWorkingLabel(null); return; }

        if (classified.agent === 'first_draft') {
            setWorkingLabel('Identifying brief…');
            const identified = await identifyBriefForDraft(text, briefRef, classified.reason);
            if (identified.status === 'matched') {
                setWorkingLabel('Preparing draft…');
                await draftForMatchedBrief(text, identified.briefId, identified.facts, classified.reason);
            }
        } else {
            setWorkingLabel(`Running ${AGENT_LABELS[classified.agent as AgentKey] ?? classified.agent}…`);
            await executeAgent(classified.agent as Exclude<AgentKey, 'first_draft' | 'unclear' | 'instruction'>, classified.reason, text, briefRef);
        }

        setWorkingLabel(null);
        setBusy(false);
        await refreshAll();
    }

    async function handleConfirmYes(run: RunView) {
        setBusy(true);
        await confirmCreateBriefAndDraft(run.id, run.input, run.payload);
        setBusy(false);
        await refreshAll();
    }
    async function handleConfirmNo(run: RunView) {
        setBusy(true);
        await dismissConfirm(run.id);
        setBusy(false);
        await refreshAll();
    }
    async function handleApprove(run: RunView) {
        const draftId = run.payload?.draftId;
        if (!draftId) return;
        setBusy(true);
        await approveAiNativeDraft(draftId, draftTexts[run.id] ?? run.live?.draftText ?? '');
        setBusy(false);
        await refreshAll();
    }
    async function handleDiscard(run: RunView) {
        const draftId = run.payload?.draftId;
        if (!draftId) return;
        setBusy(true);
        await discardAiNativeDraft(run.id, draftId);
        setBusy(false);
        await refreshAll();
    }
    async function handleResolveGap(gapId: string, answer: string) {
        if (!answer.trim()) return;
        await resolveGapAction(gapId, answer);
        setGapReplies(prev => ({ ...prev, [gapId]: '' }));
        await refreshAll();
    }
    async function handleRunNow() {
        if (runningPass) return;
        setRunningPass(true);
        await runKnowledgePassAction();
        await refreshAll();
        setRunningPass(false);
    }
    function switchToInstruct() {
        setMode('instruct');
        inputRef.current?.focus();
    }

    const placeholder = mode === 'instruct'
        ? (selectedBrief ? `Tell Junior something about ${selectedBrief.name} it should know or always do…` : 'Tell Junior something it should know or always do, firm-wide…')
        : (selectedBrief ? `What happened in ${selectedBrief.name}?` : 'Report a court date, paste a filing, drop in expenses…');
    const scopeLine = mode === 'instruct'
        ? (selectedBrief ? 'Applies to this brief' : 'Applies firm-wide')
        : (selectedBrief ? `Filed to ${selectedBrief.briefNumber}` : 'Junior finds the brief');
    const sendLabel = mode === 'instruct' ? 'Save instruction' : 'Send';

    const headKicker = selectedBrief ? selectedBrief.briefNumber
        : selectedAgent ? 'Agent'
        : new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const headTitle = selectedBrief ? selectedBrief.name
        : selectedAgent ? AGENT_LABELS[selectedAgent]
        : 'All activity';
    const headMeta = selectedBrief
        ? [selectedBrief.court, selectedBrief.judge && `Hon. Justice ${selectedBrief.judge}`, selectedBrief.nextDate ? `Next ${new Date(selectedBrief.nextDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'No next date'].filter(Boolean).join(' · ')
        : selectedAgent ? `${visibleRuns.length} run${visibleRuns.length === 1 ? '' : 's'} · every brief`
        : (reviewCount ? `${reviewCount} waiting on you` : 'Nothing waiting on you — every agent, every brief');

    return (
        <div className={styles.app}>
            {scrim && <div className={styles.scrim} onClick={() => { setSideOpen(false); setPanelOpen(false); }} />}

            {showSidebar && (
                <Sidebar
                    docked={sideDocked}
                    selectedId={selectedId}
                    onSelect={selectBrief}
                    selectedAgent={selectedAgent}
                    onSelectAgent={selectAgent}
                    briefs={briefs}
                    recentRuns={runs}
                    knowledge={knowledge}
                    onOpenKnowledge={() => { if (!panelDocked) setPanelOpen(true); }}
                    runningPass={runningPass}
                />
            )}

            <main className={styles.main}>
                <header className={styles.topbar}>
                    <div className={styles.crumbs}>
                        {!sideDocked && (
                            <button type="button" className={styles.iconBtn} style={{ marginRight: 6 }} onClick={() => setSideOpen(true)}>
                                <PanelLeft size={15} />
                            </button>
                        )}
                        <span>{selectedBrief ? 'Briefs' : selectedAgent ? 'Reforma(X)' : 'Workspace'}</span>
                        {(selectedBrief || selectedAgent) && (
                            <>
                                <ChevronRight size={14} style={{ color: 'var(--border)' }} />
                                <span className={styles.crumbCurrent}>{headTitle}</span>
                            </>
                        )}
                    </div>
                    <div className={styles.topbarRight}>
                        <span className={styles.statusDot}>
                            <span className={styles.statusDotIcon} style={{ background: busy ? 'var(--text-muted)' : 'var(--green-bright)' }} />
                            {busy ? 'Working' : 'Ready'}
                        </span>
                        {!panelDocked && (
                            <button type="button" className={styles.iconBtn} onClick={() => setPanelOpen(true)}>
                                <PanelRight size={15} />
                            </button>
                        )}
                    </div>
                </header>

                <div className={styles.scrollArea}>
                    <div className={styles.contentCol}>
                        <div className={styles.pageHead}>
                            <span className={styles.kicker}>{headKicker}</span>
                            <h1 className={styles.pageTitle}>{headTitle}</h1>
                            <span className={styles.pageMeta}>{headMeta}</span>
                            {!selectedBrief && !selectedAgent && practiceFocus && (
                                <span className={styles.focusBanner}>
                                    Set up for your <strong>{PRACTICE_FOCUS_LABELS[practiceFocus]}</strong> — Junior leads with that.
                                </span>
                            )}
                        </div>

                        {selectedAgent === 'ledger' && !selectedBrief && (
                            <div className={styles.ledgerPanelTotalCard} style={{ marginLeft: 46, marginBottom: 28, maxWidth: 360 }}>
                                <div className={styles.ledgerPanelCaption}>Last {ledger.entries.length} entries</div>
                                <div className={styles.ledgerPanelTotal}>{naira(ledger.total)}</div>
                                <a className={styles.ledgerPanelDownload} href="/api/ai-native/ledger/export">
                                    <Download size={13} />Download spreadsheet
                                </a>
                            </div>
                        )}

                        {workingLabel && (
                            <article className={styles.run}>
                                <span className={styles.runLine} />
                                <span className={styles.runBubble} style={{ background: 'var(--mint)', color: 'var(--green-deep)' }}>
                                    <Database size={15} />
                                </span>
                                <div className={styles.runBody}>
                                    <div className={styles.steps}>
                                        <span className={`${styles.step} ${styles.stepMuted}`}>
                                            <span className={styles.spin} style={{ display: 'inline-flex' }}>⟳</span>{workingLabel}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        )}

                        {visibleRuns.length === 0 && !workingLabel && (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyTitle}>Nothing on this brief today.</div>
                                <div className={styles.emptyBody}>Report a court date, drop in expenses, or switch to Instruct to tell Junior something it should know.</div>
                            </div>
                        )}

                        {visibleRuns.map(r => (
                            <RunCard
                                key={r.id}
                                run={r}
                                briefName={r.briefId ? briefs.find(b => b.id === r.briefId)?.name ?? null : null}
                                showBriefLink={!selectedId}
                                onOpenBrief={selectBrief}
                                pending={isPendingRun(r)}
                                draftText={draftTexts[r.id] ?? r.live?.draftText ?? ''}
                                onDraftTextChange={v => setDraftTexts(prev => ({ ...prev, [r.id]: v }))}
                                onApprove={() => handleApprove(r)}
                                onDiscard={() => handleDiscard(r)}
                                onConfirmYes={() => handleConfirmYes(r)}
                                onConfirmNo={() => handleConfirmNo(r)}
                                busy={busy}
                                gapReply={gapReplies[r.payload?.gapId ?? r.id] ?? ''}
                                onGapReplyChange={v => setGapReplies(prev => ({ ...prev, [r.payload?.gapId ?? r.id]: v }))}
                                onGapSubmit={() => handleResolveGap(r.payload?.gapId, gapReplies[r.payload?.gapId ?? r.id] ?? '')}
                            />
                        ))}
                    </div>
                </div>

                <Composer
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    mode={mode}
                    onMode={setMode}
                    scopeLine={scopeLine}
                    placeholder={placeholder}
                    busy={busy}
                    sendLabel={sendLabel}
                    inputRef={inputRef}
                />
            </main>

            {showPanel && (
                <RightPanel
                    docked={panelDocked}
                    knowledge={knowledge}
                    gaps={scopedGaps}
                    instructions={scopedInstructions}
                    onRunNow={handleRunNow}
                    runningPass={runningPass}
                    onResolveGap={handleResolveGap}
                    onAddInstruction={switchToInstruct}
                />
            )}
        </div>
    );
}
