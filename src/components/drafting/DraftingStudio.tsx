"use client";

import { useState, useEffect } from 'react';
import { ArrowRight, Check, AlertCircle, RefreshCw, Database, Sparkles, Bot, MessageSquare, CheckCircle2, Zap, BrainCircuit, PanelLeftOpen, PanelLeftClose, Briefcase, Lightbulb, Settings, Edit3, Info, Copy, Download, Wand2, X, ChevronRight, FileText } from 'lucide-react';
import styles from './DraftingStudio.module.css';
import { useSearchParams } from 'next/navigation';
import { getBriefById } from '@/app/actions/briefs';

export default function DraftingStudio() {
    const searchParams = useSearchParams();
    const briefId = searchParams.get('briefId');

    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [showContextPanel, setShowContextPanel] = useState(true);

    // Document State (Artifact)
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [generatedArtifact, setGeneratedArtifact] = useState<string | null>(null); // 'statement_of_claim' | null

    // Brief Context
    const [briefContext, setBriefContext] = useState<any>({});
    const MOCK_CONTEXT = {
        property_type: 'residential',
        landlord_name: 'Chief Obi',
        tenant_name: 'Acme Ltd'
    };

    // 1. Initial Load & Context Enforcement
    useEffect(() => {
        loadSystem();
    }, [briefId]);

    const loadSystem = async () => {
        setIsLoading(true);
        let foundContext: any = null;

        if (briefId) {
            try {
                const brief = await getBriefById(briefId);
                if (brief) {
                    foundContext = {
                        ...MOCK_CONTEXT,
                        brief: brief, // Store full brief object
                        claimant_name: brief.client?.name || 'Unknown Claimant',
                        defendant_name: brief.name.includes(' v. ') ? brief.name.split(' v. ')[1] : 'Unknown Defendant',
                        description: brief.description
                    };
                }
            } catch (err) {
                console.error("Failed to load brief context", err);
            }
        }
        setBriefContext(foundContext || {});
        setIsLoading(false);

        // Initial Greeting Logic
        if (foundContext) {
            setMessages([
                { id: 1, role: 'assistant', content: `I have analyzed the brief "<b>${foundContext.brief.name}</b>". I'm ready to draft. What would you like to create?` }
            ]);
        } else {
            setMessages([
                { id: 1, role: 'assistant', content: `Welcome. Please select a brief to begin drafting. Context is required.` }
            ]);
        }
    };

    const addMessage = (role: 'user' | 'assistant', content: string) => {
        setMessages(prev => [...prev, { id: Date.now(), role, content }]);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        // 1. User Message
        const userText = inputValue;
        setInputValue("");
        addMessage('user', userText);

        // 2. Strict Context Check
        if (!briefContext?.brief) {
            setTimeout(() => {
                addMessage('assistant', "I cannot draft without a valid Brief Context. Please return to the Brief Manager and select a matter.");
            }, 500);
            return;
        }

        // 3. AI Agent Simulation (Mock Logic)
        setTimeout(() => {
            const lowerText = userText.toLowerCase();

            if (lowerText.includes("draft") && (lowerText.includes("claim") || lowerText.includes("soc"))) {
                // Intent: Draft Statement of Claim
                setGeneratedArtifact('statement_of_claim');

                // Auto-fill variables from Context
                setAnswers({
                    claimant_name: briefContext.claimant_name,
                    defendant_name: briefContext.defendant_name,
                    claimant_address: "No. 1 Lagos Street", // Mock inference
                    defendant_address: "No. 2 Abuja Street", // Mock inference
                    claimant_type: briefContext.claimant_name?.includes("Ltd") ? "company" : "individual",
                    breach_type: "both", // Making an assumption based on "brief" analysis (mock)
                    demands_served: "yes"
                });

                addMessage('assistant', `I've drafted a **Statement of Claim** based on the facts in *${briefContext.brief.name}*.\n\n**Strategic Note:** I noticed we don't have the Defendant's counsel on file, so I've omitted that section to expedite filing.`);
            }
            else if (lowerText.includes("counsel")) {
                addMessage('assistant', "I've updated the draft to include the defendant's counsel details based on your input.");
                // In real logic, we'd update 'answers' here
            }
            else {
                addMessage('assistant', "I can help you draft documents for this brief. Try asking me to **'Draft a Statement of Claim'**.");
            }
        }, 800);
    };


    // -- RENDER HELPERS --
    const renderDocumentObject = () => {
        if (!generatedArtifact) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText size={48} className="mb-4 opacity-50" />
                    <p>No document generated yet.</p>
                </div>
            );
        }

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
                        <strong>{answers['claimant_name'] || '..................'}</strong>
                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>(Claimant)</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>AND</div>
                    <div style={{ textAlign: 'right' }}>
                        <strong>{answers['defendant_name'] || '..................'}</strong>
                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>(Defendant)</div>
                    </div>
                </div>

                <div className={styles.docTitle} style={{ textDecoration: 'underline' }}>STATEMENT OF CLAIM</div>

                <p className={styles.docClause}>
                    1. The Claimant is {answers['claimant_type'] === 'company' ? 'a Limited Liability Company' : 'an individual'} resident at {answers['claimant_address']}.
                </p>
                <p className={styles.docClause}>
                    2. The Defendant is resident at {answers['defendant_address']}.
                </p>
                <p className={styles.docClause}>
                    3. The Claimant Claims against the defendant as follows: <br />
                    (a) The sum of N5,000,000 being damages for breach of contract.<br />
                    (b) Cost of this action.
                </p>
                {/* ... More dynamic clauses would go here ... */}
            </div>
        );
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center">Loading Drafting Engine...</div>;
    }

    return (
        <div className="flex h-screen bg-[#F5F5F7] font-sans overflow-hidden text-[#1d1d1f]">
            {/* -- Left: Chat Interface (Claude/Gemini Style) -- */}
            <div className="w-[450px] flex flex-col border-r border-[#d2d2d7]/50 bg-white relative shadow-xl z-20">

                {/* Header: Context Indicator */}
                <div className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md z-10 sticky top-0">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${briefContext?.brief ? 'bg-green-500' : 'bg-red-400'}`}></div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {briefContext?.brief ? `Context: ${briefContext.brief.name}` : 'No Context Active'}
                        </span>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                        <Settings size={16} />
                    </button>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50/30">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}>
                                {msg.role === 'assistant' ? <Sparkles size={16} /> : <div className="font-bold text-xs">U</div>}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm ${msg.role === 'assistant' ? 'bg-white border border-gray-100 text-gray-800' : 'bg-blue-600 text-white'}`}>
                                <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                            </div>
                        </div>
                    ))}
                    <div style={{ height: 20 }} />
                </div>

                {/* Composer Input */}
                <div className="p-6 bg-white border-t border-gray-100">
                    <div className="relative shadow-sm rounded-2xl bg-gray-50 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={briefContext?.brief ? "Tell me what to draft..." : "Select a brief first."}
                            className="w-full bg-transparent p-4 min-h-[60px] max-h-[150px] outline-none text-sm text-gray-800 resize-none font-medium placeholder-gray-400"
                            disabled={!briefContext?.brief}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || !briefContext?.brief}
                                className={`p-2 rounded-xl transition-all ${inputValue.trim() ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'bg-gray-200 text-gray-400'}`}
                            >
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-3">
                        <p className="text-[10px] text-gray-400 font-medium">Reforma AI can make mistakes. Please review all drafts.</p>
                    </div>
                </div>
            </div>

            {/* -- Right: Artifact (Document Preview) -- */}
            <div className="flex-1 bg-gray-100/50 flex flex-col overflow-hidden relative">
                {/* Artifact Header */}
                <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700">
                            {generatedArtifact ? 'Statement of Claim.docx' : 'New Document'}
                        </span>
                        {generatedArtifact && <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">Draft</span>}
                    </div>
                    <div className="flex gap-2">
                        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors" title="Copy Text">
                            <Copy size={16} />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors" title="Download">
                            <Download size={16} />
                        </button>
                    </div>
                </div>

                {/* Artifact Content */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex justify-center">
                    <div className="bg-white shadow-lg min-h-[800px] w-full max-w-[800px] p-12 text-[#1d1d1f] border border-gray-200/60 rounded-sm">
                        {renderDocumentObject()}
                    </div>
                </div>
            </div>

        </div>
    );
}
