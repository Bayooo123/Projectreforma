"use client";

import { useState, useEffect } from 'react';
import { ArrowRight, Check, AlertCircle, RefreshCw, Database } from 'lucide-react';
import styles from './DraftingStudio.module.css';
import { getTemplateByName, seedStatementOfClaimTemplate, saveDraftingResponse, startDraftingSession } from '@/app/actions/drafting';

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
        const res = await getTemplateByName("Statement of Claim (Partnership)");

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
                    <div className={styles.templateTitle}>Statement of Claim (Partnership)</div>
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
