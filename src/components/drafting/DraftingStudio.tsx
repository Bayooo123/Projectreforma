"use client";

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, FolderOpen, Settings, Copy, Download, Bot, User, CheckCircle2, ChevronDown, Paperclip, Mic, Globe } from 'lucide-react';
import styles from './DraftingStudio.module.css';
import { useSearchParams, useRouter } from 'next/navigation';
import { getBriefById } from '@/app/actions/briefs';
import BriefSelector from './BriefSelector';

export default function DraftingStudio() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const briefId = searchParams.get('briefId');

    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [showContextPanel, setShowContextPanel] = useState(true);
    const [showSelector, setShowSelector] = useState(false);

    // Document State (Artifact)
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [generatedArtifact, setGeneratedArtifact] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Brief Context
    const [briefContext, setBriefContext] = useState<any>({});

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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
                        brief: brief,
                        claimant_name: brief.client?.name || 'Krown Nigeria Ltd',
                        defendant_name: brief.name.includes(' v. ') ? brief.name.split(' v. ')[1] : 'Kat Nigeria',
                        description: brief.description
                    };
                }
            } catch (err) {
                console.error("Failed to load brief context", err);
            }
        }
        setBriefContext(foundContext || {});
        setIsLoading(false);

        // Smart Greeting
        if (foundContext) {
            setMessages([
                {
                    id: 1,
                    role: 'assistant',
                    content: `Good afternoon. I've loaded the context for **${foundContext.brief.name}**. \n\nI detect this is a **Litigation** matter. Would you like me to draft a *Statement of Claim*, *List of Witnesses*, or prepare a *Case Summary*?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } else {
            setMessages([
                {
                    id: 1,
                    role: 'assistant',
                    content: `Welcome to Reforma Drafting. Please select a matter to provide context for our session.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
            // If no context, maybe show selector automatically?
            // setShowSelector(true); // User wants control usually, let them click the button or prompt text.
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue("");

        // Add User Message
        setMessages(prev => [...prev, {
            id: Date.now(),
            role: 'user',
            content: userText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        // Strict Context Check
        if (!briefContext?.brief) {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    role: 'assistant',
                    content: "Missing Context. Please select a brief using the selector above so I know which facts to apply.",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
                setShowSelector(true);
            }, 600);
            return;
        }

        // Simulate "Thinking"
        setIsLoading(true); // Just visual indicator on button potentially? 
        // Better: Typing indicator

        setTimeout(() => {
            const lowerText = userText.toLowerCase();
            let responseText = "";
            let newArtifact = generatedArtifact;

            if (lowerText.includes("draft") && (lowerText.includes("claim") || lowerText.includes("soc"))) {
                newArtifact = 'statement_of_claim';
                setAnswers({
                    claimant_name: briefContext.claimant_name,
                    defendant_name: briefContext.defendant_name,
                    claimant_address: "No. 1 Lagos Street, Victoria Island",
                    defendant_address: "No. 2 Abuja Street, Ikoyi",
                    claimant_type: briefContext.claimant_name?.toLowerCase().includes("ltd") ? "company" : "individual",
                    breach_type: "both",
                    demands_served: "yes"
                });
                responseText = `I've drafted the **Statement of Claim**. \n\nI've inferred the parties from the brief (*${briefContext.claimant_name}* vs *${briefContext.defendant_name}*). I've also added a standard clause for damages. Please review the *Reliefs Sought* section.`;
            }
            else if (lowerText.includes("counsel")) {
                responseText = "I've updated the draft to include the details for Defendant's Counsel (Festus Keyamo Chambers).";
                // Mock update logic
            }
            else {
                responseText = "I understand. Use the panel on the right to review any changes. Anything else you need for this matter?";
            }

            setGeneratedArtifact(newArtifact);
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

            setIsLoading(false);
        }, 1200);
    };

    const selectBrief = (id: string) => {
        router.push(`/drafting?briefId=${id}`); // URL drives state, clean approach
        setShowSelector(false);
    };

    // -- RENDER HELPERS --
    const renderDocumentObject = () => {
        if (!generatedArtifact) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 select-none">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Sparkles size={48} className="text-gray-200" />
                    </div>
                    <p className="font-medium text-lg">Reforma Intelligent Engine</p>
                    <p className="text-sm opacity-60">Ready to generate</p>
                </div>
            );
        }

        return (
            <div className={styles.documentPage}>
                <div className={styles.docTitle} style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: '"Times New Roman", Times, serif' }}>
                    IN THE HIGH COURT OF LAGOS STATE<br />
                    IN THE IKEJA JUDICIAL DIVISION<br />
                    HOLDEN AT IKEJA
                </div>

                <div className="flex justify-between mb-8 font-serif">
                    <div>SUIT NO: ........................</div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center mb-12 font-serif">
                    <div>
                        <strong>BETWEEN</strong><br /><br />
                        <strong className="uppercase">{answers['claimant_name'] || '..................'}</strong>
                        <div className="text-xs italic mt-1">(Claimant)</div>
                    </div>
                    <div className="text-center italic">AND</div>
                    <div className="text-right">
                        <strong className="uppercase">{answers['defendant_name'] || '..................'}</strong>
                        <div className="text-xs italic mt-1">(Defendant)</div>
                    </div>
                </div>

                <div className="text-center font-bold underline mb-8 font-serif text-lg">STATEMENT OF CLAIM</div>

                <div className="space-y-6 font-serif leading-relaxed text-justify">
                    <p>
                        1. The Claimant is {answers['claimant_type'] === 'company' ? 'a Limited Liability Company registered under the Laws of the Federation of Nigeria' : 'an individual'} carrying on business at {answers['claimant_address']}.
                    </p>
                    <p>
                        2. The Defendant is, to the best of the Claimant's knowledge, resident/carrying on business at {answers['defendant_address']}.
                    </p>
                    <p>
                        3. The Claimant Claims against the defendant as follows: <br />
                        <span className="block pl-8 mt-2">(a) The sum of ₦5,000,000 (Five Million Naira) being general damages for breach of contract.</span>
                        <span className="block pl-8 mt-1">(b) Interest on the said sum at the rate of 21% per annum until judgment is delivered.</span>
                        <span className="block pl-8 mt-1">(c) Cost of this action.</span>
                    </p>
                </div>

                <div className="mt-12 pt-12 border-t border-black/10 flex justify-end font-serif">
                    <div className="text-right">
                        <p className="mb-8">Dated this ______ day of ___________ 2025</p>
                        <div className="border-t border-black w-48 ml-auto my-2"></div>
                        <p className="font-bold">ADEYEMI & CO.</p>
                        <p className="text-xs">Solicitors to the Claimant</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-[#F0F2F5] font-sans overflow-hidden text-[#1d1d1f]">
            {/* Context Selector Modal */}
            {showSelector && (
                <BriefSelector
                    onSelect={selectBrief}
                    onClose={() => setShowSelector(false)}
                    currentBriefId={briefId}
                />
            )}

            {/* -- Left: Chat Interface -- */}
            <div className="w-[450px] flex flex-col border-r border-white/50 bg-[#F7F9FC] relative shadow-2xl z-20">

                {/* Header */}
                <div className="h-16 border-b border-gray-200/60 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl z-10 sticky top-0 shadow-sm">
                    <button
                        onClick={() => setShowSelector(true)}
                        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all border ${briefContext?.brief ? 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm' : 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'}`}
                    >
                        <div className={`w-2.5 h-2.5 rounded-full ${briefContext?.brief ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Context</span>
                            <span className="text-xs font-semibold max-w-[150px] truncate leading-tight">
                                {briefContext?.brief ? briefContext.brief.name : 'Select Matter...'}
                            </span>
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-black/5 transition-colors">
                        <Settings size={18} />
                    </button>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar scroll-smooth">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up group`}>

                            {/* Avatar */}
                            {msg.role === 'assistant' ? (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#00c6fb] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 mt-1">
                                    <Sparkles size={14} className="text-white" />
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                                    <User size={14} className="text-gray-500" />
                                </div>
                            )}

                            {/* Bubble */}
                            <div className="flex flex-col max-w-[85%]">
                                <div className={`px-5 py-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm relative ${msg.role === 'assistant'
                                        ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                        : 'bg-[#0071e3] text-white rounded-tr-sm border border-[#0071e3]'
                                    }`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                                </div>
                                <span className={`text-[10px] text-gray-300 mt-1.5 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    {msg.timestamp}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex gap-4 animate-fade-in">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#00c6fb] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 mt-1">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Composer Input */}
                <div className="p-5 bg-[#F7F9FC]">
                    <div className="relative shadow-sm rounded-[24px] bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-[#0071e3]/10 focus-within:border-[#0071e3] transition-all flex flex-col overflow-hidden">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={briefContext?.brief ? "Drafting instructions..." : "Please select a context first."}
                            className="w-full bg-transparent px-5 py-4 min-h-[50px] max-h-[120px] outline-none text-[13.5px] text-gray-800 resize-none font-medium placeholder-gray-400"
                            disabled={!briefContext?.brief}
                        />
                        <div className="flex items-center justify-between px-3 pb-3 pt-0">
                            <div className="flex gap-2">
                                <button className="p-2 text-gray-400 hover:text-[#0071e3] transition-colors rounded-full hover:bg-blue-50" title="Attach Context">
                                    <Paperclip size={16} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-[#0071e3] transition-colors rounded-full hover:bg-blue-50" title="Voice Input">
                                    <Mic size={16} />
                                </button>
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || !briefContext?.brief}
                                className={`p-2 rounded-full transition-all duration-300 ${inputValue.trim() ? 'bg-[#0071e3] text-white shadow-md hover:bg-[#0077ED] transform scale-100' : 'bg-gray-100 text-gray-300 scale-95'
                                    }`}
                            >
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                    <p className="text-center mt-3 text-[10px] text-gray-400 font-medium opacity-60">
                        AI-generated content. Review for legal accuracy.
                    </p>
                </div>
            </div>

            {/* -- Right: Live Preview Panel -- */}
            <div className="flex-1 bg-[#EEF2F6] flex flex-col overflow-hidden relative shadow-inner">
                <div className="h-16 border-b border-gray-200/60 flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <FileText size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-800">{generatedArtifact ? 'Statement of Claim.docx' : 'Drafting Canvas'}</div>
                            <div className="text-[10px] text-gray-500 font-medium">Last updated just now</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all">
                            <Copy size={14} /> Copy
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#0077ED] rounded-lg shadow-sm shadow-blue-500/20 transition-all">
                            <Download size={14} /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Artifact Content */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex justify-center bg-[#EEF2F6]">
                    <div className="bg-white shadow-2xl shadow-gray-300/50 min-h-[900px] w-full max-w-[800px] p-[60px] text-[#1d1d1f] transition-all duration-500 ease-in-out transform hover:scale-[1.002]">
                        {renderDocumentObject()}
                    </div>
                </div>
            </div>

        </div>
    );
}
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
