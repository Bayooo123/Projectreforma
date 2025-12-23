"use client";

import { useState, useEffect } from 'react';
import { ArrowRight, Check, AlertCircle, RefreshCw, Database } from 'lucide-react';
import styles from './DraftingStudio.module.css';
import { getTemplateByName, seedLagosTenancyTemplate, saveDraftingResponse, startDraftingSession } from '@/app/actions/drafting';

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
    const [isLoading, setIsLoading] = useState(true);
    const [nodes, setNodes] = useState<DraftingNode[]>([]);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Mock Context for Gap Analysis Simulation
    const BRIEF_CONTEXT = {
        property_type: 'residential',
        landlord_name: 'Chief Obi',
        tenant_name: 'Acme Ltd'
    };

    // 1. Initial Load
    useEffect(() => {
        loadSystem();
    }, []);

    const loadSystem = async () => {
        setIsLoading(true);
        // Try to fetch the standard template
        const res = await getTemplateByName("Lagos Tenancy Agreement");

        if (res.success && res.data) {
            // Transform database nodes to frontend shape if needed
            // (Prisma structure closely matches, just handling nulls)
            setNodes(res.data.nodes as any);
            setTemplateId(res.data.id);

            // Start a new session
            const sessionRes = await startDraftingSession(res.data.id);
            if (sessionRes.success) setSessionId(sessionRes.sessionId!);
        } else {
            // Template doesn't exist yet
            setNodes([]);
        }
        setIsLoading(false);
    };

    const handleSeed = async () => {
        setIsLoading(true);
        await seedLagosTenancyTemplate();
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
        if (currentVar && BRIEF_CONTEXT[currentVar as keyof typeof BRIEF_CONTEXT] && !answers[currentVar]) {
            const autoValue = BRIEF_CONTEXT[currentVar as keyof typeof BRIEF_CONTEXT];

            // Simulate "Reading" delay
            const timer = setTimeout(() => {
                // Determine which option matches the autoValue
                const matchedOption = currentNode.options?.find(o => o.value === autoValue);
                if (matchedOption) {
                    handleSelectOption(matchedOption);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentNodeIndex, currentNode, answers]);


    // -- RENDER HELPERS --
    const renderDocumentObject = () => {
        return (
            <div className={styles.documentPage}>
                <div className={styles.docTitle}>TENANCY AGREEMENT</div>
                <div className={styles.docClause} style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                    {/* Dynamic Citation Bar */}
                    {answers['property_type'] === 'residential' && <span>[Cited: Tenancy Law of Lagos State 2011]</span>}
                </div>

                <p className={styles.docClause}>
                    <strong>THIS AGREEMENT</strong> is made this ____ day of ________, 2024.
                </p>

                <p className={styles.docClause}>
                    <strong>BETWEEN:</strong><br />
                    [LANDLORD NAME], of [Address] (hereinafter called "The Landlord") of the one part.
                </p>

                <p className={styles.docClause}>
                    <strong>AND:</strong><br />
                    [TENANT NAME], of [Address] (hereinafter called "The Tenant") of the other part.
                </p>

                <div className={styles.docClause}>
                    <strong>WHEREAS:</strong><br />
                    1. The Landlord is the beneficial owner of the {answers['property_type'] === 'commercial' ? 'commercial' : 'residential'} property known as [PROPERTY ADDRESS].
                </div>

                {answers['duration_type'] && (
                    <div className={styles.docClause}>
                        <strong>1. TERM</strong><br />
                        The tenancy shall be for a fixed term of
                        <span className={styles.highlight}>
                            {answers['duration_type'] === '1_year' ? ' ONE (1) YEAR ' :
                                answers['duration_type'] === '2_years' ? ' TWO (2) YEARS ' : ' [LONG LEASE TERM] '}
                        </span>
                        commencing on [START DATE].
                    </div>
                )}

                {answers['repairs'] && (
                    <div className={styles.docClause}>
                        <strong>2. REPAIRS</strong><br />
                        {answers['repairs'] === 'landlord'
                            ? "The Landlord shall be responsible for all structural and external repairs to the Demised Premises, including the roof, main walls, and foundation."
                            : "The Tenant shall keep the interior and exterior of the Demised Premises in good and substantial repair and condition (fair wear and tear excepted)."}
                    </div>
                )}

                {!isFinished && nodes.length > 0 && (
                    <div style={{ opacity: 0.5, marginTop: '2rem', fontStyle: 'italic' }}>
                        ... Drafting in progress ...
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center">Loading Drafting Engine...</div>;
    }

    // No Template Found State
    if (nodes.length === 0) {
        return (
            <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                <div className="text-xl font-bold">System Initialization Required</div>
                <p className="text-gray-500 max-w-md text-center">
                    The logic database is currently empty. Initialize the "Lagos Tenancy Agreement" template to start the engine.
                </p>
                <button
                    onClick={handleSeed}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                    <Database size={20} />
                    Seed Database with Template
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* LEFT PANEL: Socratic Logic */}
            <div className={styles.leftPanel}>
                <div className={styles.chatHeader}>
                    <div className={styles.templateTitle}>Tenancy Agreement (Lagos)</div>
                    <div className={styles.templateMeta}>
                        <span style={{ color: 'green' }}>● Connected to Brief: #B-2024-001</span>
                    </div>
                </div>

                <div className={styles.interactionArea}>
                    {!isFinished ? (
                        <div className={styles.questionCard}>
                            {/* Auto-Resolve Indicator */}
                            {currentNode.variableName && BRIEF_CONTEXT[currentNode.variableName as keyof typeof BRIEF_CONTEXT] && (
                                <div style={{
                                    background: '#F0FDF4',
                                    color: '#166534',
                                    padding: '0.5rem',
                                    fontSize: '0.8rem',
                                    marginBottom: '1rem',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <Check size={14} />
                                    Context Found: "This is a {BRIEF_CONTEXT[currentNode.variableName as keyof typeof BRIEF_CONTEXT]} property" (Auto-selected)
                                </div>
                            )}

                            <div className={styles.questionText}>
                                {currentNode.content}
                            </div>

                            {currentNode.helpText && (
                                <div className={styles.helpText}>
                                    <AlertCircle size={14} style={{ display: 'inline', marginRight: 8 }} />
                                    {currentNode.helpText}
                                </div>
                            )}

                            <div className={styles.optionsGrid}>
                                {currentNode.options?.map(opt => (
                                    <button
                                        key={opt.id}
                                        className={`${styles.optionBtn} ${answers[currentNode.variableName!] === opt.value ? styles.selected : ''}`}
                                        onClick={() => handleSelectOption(opt)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.questionCard}>
                            <div className={styles.questionText}>Drafting Complete!</div>
                            <div className={styles.helpText}>
                                <Check size={14} style={{ display: 'inline', marginRight: 8 }} />
                                The document has been generated based on your strategic decisions.
                            </div>

                            <button className={styles.optionBtn} onClick={handleRestart}>
                                <RefreshCw size={14} style={{ display: 'inline', marginRight: 8 }} />
                                Restart Session
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: Live Preview */}
            <div className={styles.rightPanel}>
                {renderDocumentObject()}
            </div>
        </div>
    );
}
