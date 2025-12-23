"use client";

import { useState, useEffect } from 'react';
import { ArrowRight, Check, AlertCircle, RefreshCw, Database, Sparkles, Bot, MessageSquare, CheckCircle2, Zap, BrainCircuit, PanelLeftOpen, PanelLeftClose, Briefcase, Lightbulb, Settings, Edit3, Info, Copy, Download, Wand2, X, ChevronRight, FileText } from 'lucide-react';
import styles from './DraftingStudio.module.css';
import { useSearchParams } from 'next/navigation';
import { getTemplateByName, seedStatementOfClaimTemplate, saveDraftingResponse, startDraftingSession } from '@/app/actions/drafting';
import { getBriefById } from '@/app/actions/briefs';

// Types matching Prisma + Frontend needs
interface NodeOption {
    id: string;
    label: string;
    value: string;
}

interface DraftingNode {
    id: string;
    type: string; // 'QUESTION' | 'INFO'
    content: string;
    helpText?: string | null;
    variableName?: string | null;
    options?: NodeOption[];
}

export default function DraftingStudio() {
    const searchParams = useSearchParams();
    const briefId = searchParams.get('briefId');

    const [isLoading, setIsLoading] = useState(true);
    const [nodes, setNodes] = useState<DraftingNode[]>([]);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showContextPanel, setShowContextPanel] = useState(true);

    // Brief Context for Auto-Answers
    const [briefContext, setBriefContext] = useState<any>({});

    // Fallback Mock Context (Merging logic handled in loadSystem)
    const MOCK_CONTEXT = {
        property_type: 'residential',
        landlord_name: 'Chief Obi',
        tenant_name: 'Acme Ltd'
    };

    const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // 1. Initial Load
    useEffect(() => {
        loadSystem();
    }, [briefId]);

    const loadSystem = async () => {
        setIsLoading(true);

        // A. Load Brief Context if available
        let foundContext: any = MOCK_CONTEXT;
        if (briefId) {
            try {
                const brief = await getBriefById(briefId);
                if (brief) {
                    // Heuristic Mapping
                    foundContext = {
                        ...MOCK_CONTEXT,
                        claimant_name: brief.client?.name || '',
                        // Try to guess Defendant from Brief Name (e.g., "Client v. Defendant")
                        defendant_name: brief.name.includes(' v. ') ? brief.name.split(' v. ')[1] : '',
                        description: brief.description
                    };
                }
            } catch (err) {
                console.error("Failed to load brief context", err);
            }
        }
        setBriefContext(foundContext);

        // B. Load Template
        const res = await getTemplateByName("Statement of Claim (Partnership)");

        if (res.success && res.data) {
            setNodes(res.data.nodes as any);
            setTemplateId(res.data.id);

            // Start a new session
            const sessionRes = await startDraftingSession(res.data.id, briefId || undefined);
            if (sessionRes.success) setSessionId(sessionRes.sessionId!);
        } else {
            setNodes([]);
        }
        setIsLoading(false);
    };

    const handleSeed = async () => {
        setIsLoading(true);
        await seedStatementOfClaimTemplate();
        await loadSystem(); // Reload
    };

    // 2. Interaction Logic
    const currentNode = nodes[currentNodeIndex];
    const isFinished = nodes.length > 0 && currentNodeIndex >= nodes.length;

    const handleSelectOption = async (option: NodeOption) => {
        // Optimistic Update
        if (currentNode.variableName) {
            setAnswers(prev => ({
                ...prev,
                [currentNode.variableName!]: option.value
            }));

            // Save to Backend (Fire and Forget for smoothness)
            if (sessionId) {
                saveDraftingResponse(sessionId, currentNode.id, option.value);
            }
        }

        // Advance
        setTimeout(() => {
            if (currentNodeIndex < nodes.length) {
                setCurrentNodeIndex(prev => prev + 1);
            }
        }, 400);
    };

    const handleRestart = () => {
        setAnswers({});
        setCurrentNodeIndex(0);
        // Ideally fetch a new session here too
    };

    // 3. Gap Analysis (Auto-Answer)
    useEffect(() => {
        if (!currentNode) return;

        const currentVar = currentNode.variableName;
        // Check if we have context AND we haven't answered it yet
        if (currentVar && briefContext[currentVar as keyof typeof briefContext] && !answers[currentVar]) {
            const autoValue = briefContext[currentVar as keyof typeof briefContext];

            // Simulate "Reading" delay
            const timer = setTimeout(() => {
                // Determine which option matches the autoValue
                const matchedOption = currentNode.options?.find(o => o.value === autoValue);
                if (matchedOption) {
                    handleSelectOption(matchedOption);
                } else if (currentNode.type !== 'QUESTION') {
                    // For text variables (non-questions), we might want to auto-fill? 
                    // Currently checking options matches, but string variables need direct set
                    setAnswers(prev => ({ ...prev, [currentVar]: autoValue }));
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentNodeIndex, currentNode, answers, briefContext]);


    // -- RENDER HELPERS --
    const renderDocumentObject = () => {
        return (
            <div className={styles.documentPage}>
                <div className={styles.docTitle} style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    IN THE HIGH COURT OF LAGOS STATE<br />
                    IN THE IKEJA JUDICIAL DIVISION<br />
                    HOLDEN AT IKEJA
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div>SUIT NO: ........................</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <strong>BETWEEN</strong><br /><br />
                        <strong>{answers['claimant_name'] || 'KROWN NIGERIA LIMITED'}</strong>
                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>(Claimant)</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>AND</div>
                    <div style={{ textAlign: 'right' }}>
                        <strong>{answers['defendant_name'] || 'KAT NIGERIA'}</strong>
                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>(Defendant)</div>
                    </div>
                </div>

                <div className={styles.docTitle} style={{ textDecoration: 'underline' }}>STATEMENT OF CLAIM</div>

                <p className={styles.docClause}>
                    1. The Claimant is
                    {answers['claimant_type'] === 'individual' ? ' an individual trading under the name and style of...' : ' an incorporated limited liability company registered in Nigeria under Companies and Allied Matters Act'}
                    , which deals in rendering catering services and supply of general goods and merchandise with its registered/head office at {answers['claimant_address'] || 'No.1 Benakol Street, Victoria Island, Lagos'}.
                </p>

                <p className={styles.docClause}>
                    2. The Defendant is an incorporated limited liability company registered in Nigeria under Companies and Allied Matters Act, which deals in supply of general goods and merchandise with its registered/head office at {answers['defendant_address'] || 'No. 2 Allen Avenue, Ikoyi, Lagos'}.
                </p>

                <p className={styles.docClause}>
                    3. The Claimant avers that a valid partnership contract was signed between the Claimant and the Defendant
                    {answers['partnership_start_date'] ? ` on ${answers['partnership_start_date']}` : ' between March 1995 and December 1997'}
                    which is still subsisting.
                </p>

                {answers['breach_type'] && (
                    <div className={styles.docClause} style={{ borderLeft: '3px solid green', paddingLeft: '10px' }}>
                        <strong>[AI Inserted Averment on Breach]</strong><br />
                        8. The Claimant avers that the Defendant
                        {answers['breach_type'] === 'conversion'
                            ? " refused to respond to any of the letters and instead purported to convert the partnership vehicles to its sole use."
                            : answers['breach_type'] === 'non_remittance'
                                ? " refused to remit the agreed sum of N2.17 Million accrued from the contract."
                                : " refused to remit the accrued sums AND purported to convert the partnership vehicles to its sole use."}
                        <br />
                        By reason of this, the Defendant has breached the terms of the partnership contract.
                    </div>
                )}

                {answers['demands_served'] === 'yes' && (
                    <p className={styles.docClause}>
                        7. The claimant avers that several letters of demand were written to the Defendant for the share of the proceeds of the contract. The Claimant pleads these letters and shall rely on them at trial.
                    </p>
                )}

                <div style={{ marginTop: '2rem' }}>
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>WHEREFORE THE CLAIMANT CLAIMS AS FOLLOWS:</div>
                    <ol style={{ paddingLeft: '20px', listStyleType: 'lower-roman' }}>
                        <li>A DECLARATION that the contract between the parties is still subsisting;</li>
                        {(answers['breach_type'] === 'conversion' || answers['breach_type'] === 'both') && (
                            <li>AN ORDER FOR THE SHARING OF THE VEHICLES between the parties.</li>
                        )}
                        <li>AN ORDER FOR DAMAGES FOR BREACH OF CONTRACT.</li>
                    </ol>
                </div>

                {!isFinished && nodes.length > 0 && (
                    <div style={{ opacity: 0.5, marginTop: '2rem', fontStyle: 'italic' }}>
                        ... Drafting in progress ...
                    </div>
                )}
            </div>
        );
    };

    // -- Derived Strategy (Mock Logic for Demo) --
    const strategicInsights = [];
    if (briefContext?.brief) {
        strategicInsights.push({
            type: 'info',
            title: 'Context Loaded',
            message: `Pulling facts from Matter "${briefContext.brief.name}".`
        });
    }
    // Specific Logic based on template name
    if (nodes.length > 0 && nodes[0].content && nodes[0].content.includes("Partnership")) {
        strategicInsights.push({
            type: 'strategy',
            title: 'Procedural Strategy',
            message: "We don't have a record of the Defendant's Counsel yet. Recommended: Omit counsel details in the initial filing to avoid procedural delays. Service will be effected personally."
        });
    }

    if (isLoading) {
        return <div className="p-8 flex justify-center">Loading Drafting Engine...</div>;
    }



    // No Template Found State
    if (nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-800 font-sans">
                <div className="mb-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center max-w-lg text-center animate-fade-in-up">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                        <Sparkles size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 tracking-tight">Intelligent Drafting Engine</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        The engine is ready. Initialize the "Statement of Claim (Partnership)" template to start the socratic process.
                    </p>

                    <button
                        onClick={handleSeed}
                        className="flex items-center gap-2 bg-[#0071e3] text-white px-8 py-3 rounded-full hover:bg-[#0077ED] transition-all font-medium text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        <Database size={16} />
                        Seed Database & Start
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#F5F5F7] font-sans overflow-hidden text-[#1d1d1f]">
            {/* -- Left: Context & Strategy (Collapsible) -- */}
            {showContextPanel && (
                <div className="w-80 flex-shrink-0 bg-[#FBFBFD] border-r border-[#d2d2d7]/50 flex flex-col z-10 shadow-sm transition-all duration-300">
                    <div className="h-14 border-b border-[#d2d2d7]/50 flex items-center justify-between px-5 bg-white/50 backdrop-blur-xl sticky top-0">
                        <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">Context & Strategy</span>
                        <button onClick={() => setShowContextPanel(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <PanelLeftClose size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {/* Brief Card */}
                        <div className="p-4 bg-white rounded-2xl border border-[#d2d2d7]/50 shadow-sm">
                            <div className="flex items-center gap-2 mb-3 text-gray-800 font-semibold text-sm">
                                <Briefcase size={14} className="text-blue-500" />
                                <span>Active Matter</span>
                            </div>
                            {briefContext?.brief ? (
                                <div>
                                    <div className="text-sm font-medium mb-1 text-gray-900">{briefContext.brief.name}</div>
                                    <div className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{briefContext.brief.description}</div>
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                                        <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100">Litigation</span>
                                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-100">Live Context</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-400 italic">No brief linked. Running in Sandbox.</div>
                            )}
                        </div>

                        {/* Strategic Advisor */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-1 px-1">
                                <Lightbulb size={12} />
                                <span>AI Advisor</span>
                            </div>

                            {strategicInsights.map((insight, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl border text-sm ${insight.type === 'strategy' ? 'bg-indigo-50/50 border-indigo-100 text-indigo-900' : 'bg-white border-gray-200 text-gray-700'} shadow-sm`}>
                                    <div className="font-semibold mb-1 flex items-center gap-2 text-xs uppercase tracking-wide">
                                        {insight.type === 'strategy' && <Sparkles size={12} className="text-indigo-500" />}
                                        {insight.title}
                                    </div>
                                    <div className="opacity-80 leading-relaxed text-xs">
                                        {insight.message}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* -- Center: The Socratic Drafting Canvas -- */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F5F5F7] relative">

                {/* Header */}
                <div className="h-14 border-b border-[#d2d2d7]/50 flex items-center justify-between px-6 bg-white/70 backdrop-blur-xl sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        {!showContextPanel && (
                            <button onClick={() => setShowContextPanel(true)} className="text-gray-500 hover:text-gray-800 transition-colors">
                                <PanelLeftOpen size={20} />
                            </button>
                        )}
                        <h1 className="text-sm font-semibold tracking-tight text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Statement of Claim (Partnership)
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400 font-medium tracking-wide update-indicator">AUTOSAVED</span>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-black/5 transition-colors">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Scroll Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto py-12 px-8">

                        {/* 1. Prompt / Intent Input (Steve Jobs "Tell it what to do") */}
                        <div className="mb-12 animate-fade-in-down">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                    <Wand2 size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Describe your drafting goal (e.g., 'Draft a claim for unpaid partnership dues with interest')..."
                                    className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all text-sm font-medium"
                                />
                                <div className="absolute inset-y-0 right-2 flex items-center">
                                    <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 2. Questions Flow */}
                        <div className="space-y-8 pb-32">
                            {/* History */}
                            {/* Note: We would map the 'answers' here, but showing just the active one for clarity in demo */}
                            {currentNode?.variableName && briefContext[currentNode.variableName as keyof typeof briefContext] && (
                                <div className="flex items-start gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 animate-fade-in">
                                    <div className="mt-1 p-1 bg-emerald-100 text-emerald-600 rounded-md">
                                        <Zap size={14} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Context Auto-Applied</div>
                                        <div className="text-sm text-emerald-900 leading-relaxed">
                                            Found matching data in brief: <span className="font-semibold">"{briefContext[currentNode.variableName as keyof typeof briefContext]}"</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active Question Card */}
                            {!isFinished ? (
                                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden animate-fade-in-up">
                                    <div className="p-8 border-b border-gray-50">
                                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">Question {history.length + 1}</div>
                                        <h3 className="text-xl font-semibold text-gray-900 leading-relaxed">
                                            {currentNode.content}
                                        </h3>
                                        {currentNode.helpText && (
                                            <div className="mt-3 flex items-start gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-xl">
                                                <Info size={16} className="mt-0.5 flex-shrink-0" />
                                                <span className="leading-snug">{currentNode.helpText}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-gray-50/50">
                                        {/* Logic for Input Types - currently mainly options in our seed */}
                                        {currentNode.options ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {currentNode.options.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => handleSelectOption(opt)}
                                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group text-left
                                                            ${answers[currentNode.variableName!] === opt.value
                                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.01]'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:shadow-sm'
                                                            }`}
                                                    >
                                                        <span className="font-medium text-sm">{opt.label}</span>
                                                        {answers[currentNode.variableName!] === opt.value ? (
                                                            <CheckCircle2 size={18} className="text-white" />
                                                        ) : (
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-gray-400 italic">
                                                Free text input not fully implemented in this demo mode.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 bg-white rounded-3xl shadow-sm border border-gray-100 text-center animate-fade-in-up">
                                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Drafting Complete</h3>
                                    <p className="text-gray-500 mb-6">The document has been generated based on your inputs and strategic decisions.</p>
                                    <button
                                        onClick={handleRestart}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
                                    >
                                        <RefreshCw size={16} />
                                        Start New Draft
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* -- Right: Live Preview Panel -- */}
            <div className="w-[45%] bg-white border-l border-[#d2d2d7]/50 flex flex-col hidden xl:flex shadow-sm z-10">
                <div className="h-14 border-b border-[#d2d2d7]/50 flex items-center justify-between px-6 bg-white sticky top-0">
                    <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">Live Document Preview</span>
                    <div className="flex gap-2">
                        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" title="Copy Text">
                            <Copy size={16} />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" title="Download PDF">
                            <Download size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8">
                    <div className="bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] min-h-[800px] p-12 text-sm leading-relaxed text-[#1d1d1f] font-serif border border-gray-200/60 rounded-sm">
                        {renderDocumentObject()}
                    </div>
                </div>
            </div>
        </div>
    );
}
