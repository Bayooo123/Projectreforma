"use client";

import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, AlertCircle, RefreshCw } from 'lucide-react';
import styles from './DraftingStudio.module.css';

// Mock Data Types (Matches our Schema mentally)
interface NodeOption {
    id: string;
    label: string;
    value: string;
    explanation?: string;
}

interface DraftingNode {
    id: string;
    type: 'QUESTION' | 'INFO';
    content: string;
    helpText?: string;
    variableName?: string; // e.g., 'tenancy_type'
    options?: NodeOption[];
}

// Mock Template Data: "Lagos Tenancy Agreement"
const MOCK_NODES: DraftingNode[] = [
    {
        id: '1',
        type: 'QUESTION',
        content: 'Is this tenancy for a residential or commercial property?',
        helpText: 'The Tenancy Law of Lagos State 2011 has specific exemptions for certain commercial premises. This choice determines which statutory citations we include.',
        variableName: 'property_type',
        options: [
            { id: 'opt_1', label: 'Residential Premises', value: 'residential' },
            { id: 'opt_2', label: 'Commercial Premises', value: 'commercial' }
        ]
    },
    {
        id: '2',
        type: 'QUESTION',
        content: 'What is the duration of the tenancy?',
        helpText: 'Tenancies over 3 years require a deed and specific registration under the Land Registration Law.',
        variableName: 'duration_type',
        options: [
            { id: 'opt_3', label: 'One Year (Standard)', value: '1_year' },
            { id: 'opt_4', label: 'Two Years', value: '2_years' },
            { id: 'opt_5', label: 'Specific Term (> 3 Years)', value: 'long_lease' }
        ]
    },
    {
        id: '3',
        type: 'QUESTION',
        content: 'Who is responsible for external repairs?',
        helpText: 'Standard practice is Landlord, but full repairing leases shift this to the Tenant.',
        variableName: 'repairs',
        options: [
            { id: 'opt_6', label: 'Landlord (Standard)', value: 'landlord' },
            { id: 'opt_7', label: 'Tenant (Full Repairing)', value: 'tenant' }
        ]
    }
];

export default function DraftingStudio() {
    const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<number[]>([]); // Track path

    const currentNode = MOCK_NODES[currentNodeIndex];
    const isFinished = currentNodeIndex >= MOCK_NODES.length;

    const handleSelectOption = (option: NodeOption) => {
        if (currentNode.variableName) {
            setAnswers(prev => ({
                ...prev,
                [currentNode.variableName!]: option.value
            }));
        }

        // Advance to next node
        setTimeout(() => {
            if (currentNodeIndex < MOCK_NODES.length) {
                setHistory([...history, currentNodeIndex]);
                setCurrentNodeIndex(prev => prev + 1);
            }
        }, 400); // Small delay for visual feedback
    };

    const handleRestart = () => {
        setAnswers({});
        setCurrentNodeIndex(0);
        setHistory([]);
    };

    // -- RENDER HELPERS --

    // Generate Document Text based on answers
    const renderDocumentObject = () => {
        return (
            <div className={styles.documentPage}>
                <div className={styles.docTitle}>TENANCY AGREEMENT</div>

                <p className={styles.docClause}>
                    <strong>THIS AGREEMENT</strong> is made this ____ day of ________, 2024.
                </p>

                <p className={styles.docClause}>
                    <strong>BETWEEN:</strong>
                    <br />
                    [LANDLORD NAME], of [Address] (hereinafter called "The Landlord") of the one part.
                </p>

                <p className={styles.docClause}>
                    <strong>AND:</strong>
                    <br />
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

                {/* Placeholder for future clauses */}
                {!isFinished && (
                    <div style={{ opacity: 0.5, marginTop: '2rem', fontStyle: 'italic' }}>
                        ... Drafting in progress ...
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {/* LEFT PANEL: Socratic Logic */}
            <div className={styles.leftPanel}>
                <div className={styles.chatHeader}>
                    <div className={styles.templateTitle}>Tenancy Agreement (Lagos)</div>
                    <div className={styles.templateMeta}>Socratic Mode • AI Assisted</div>
                </div>

                <div className={styles.interactionArea}>
                    {!isFinished ? (
                        <div className={styles.questionCard}>
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
