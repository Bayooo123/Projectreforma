"use client";

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, FolderOpen, Settings, Copy, Download, Bot, User, CheckCircle2, ChevronDown, Paperclip, Mic, Globe, FileText, X } from 'lucide-react';
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
    const [showSelector, setShowSelector] = useState(false);

    // Document State
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [generatedArtifact, setGeneratedArtifact] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Brief Context
    const [briefContext, setBriefContext] = useState<any>({});

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Initial Load
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
        setIsLoading(true);

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
        router.push(`/drafting?briefId=${id}`);
        setShowSelector(false);
    };

    // -- RENDER HELPERS --
    const renderDocumentObject = () => {
        if (!generatedArtifact) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 select-none">
                    <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                        <Sparkles size={28} className="text-slate-300" />
                    </div>
                    <p className="font-semibold text-base text-slate-600">Reforma Intelligent Engine</p>
                    <p className="text-sm opacity-60">Context aware. Ready to generate.</p>
                </div>
            );
        }

        return (
            <div className="bg-white w-full max-w-[800px] min-h-[1000px] p-[60px] shadow-2xl border border-slate-200 mx-auto transition-all duration-500 ease-in-out font-[Times_New_Roman]">
                <div className="text-center mb-10 uppercase font-bold text-lg leading-relaxed tracking-wide">
                    IN THE HIGH COURT OF LAGOS STATE<br />
                    IN THE IKEJA JUDICIAL DIVISION<br />
                    HOLDEN AT IKEJA
                </div>

                <div className="flex justify-between mb-8">
                    <div>SUIT NO: ........................</div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center mb-12">
                    <div>
                        <strong>BETWEEN</strong><br /><br />
                        <strong className="uppercase">{answers['claimant_name'] || '..................'}</strong>
                        <div className="text-xs italic mt-1">(Claimant)</div>
                    </div>
                    <div className="text-center italic font-serif">AND</div>
                    <div className="text-right">
                        <strong className="uppercase">{answers['defendant_name'] || '..................'}</strong>
                        <div className="text-xs italic mt-1">(Defendant)</div>
                    </div>
                </div>

                <div className="text-center font-bold underline mb-10 text-xl">STATEMENT OF CLAIM</div>

                <div className="space-y-6 leading-loose text-justify text-[16px]">
                    <p>
                        1. The Claimant is {answers['claimant_type'] === 'company' ? 'a Limited Liability Company registered under the Laws of the Federation of Nigeria' : 'an individual'} carrying on business at {answers['claimant_address']}.
                    </p>
                    <p>
                        2. The Defendant is, to the best of the Claimant's knowledge, resident/carrying on business at {answers['defendant_address']}.
                    </p>
                    <p>
                        3. The Claimant Claims against the defendant as follows: <br />
                        <span className="block pl-10 mt-2">(a) The sum of ₦5,000,000 (Five Million Naira) being general damages for breach of contract.</span>
                        <span className="block pl-10 mt-1">(b) Interest on the said sum at the rate of 21% per annum until judgment is delivered.</span>
                        <span className="block pl-10 mt-1">(c) Cost of this action.</span>
                    </p>
                </div>

                <div className="mt-20 pt-8 border-t border-black/20 flex justify-end">
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
        <div className="flex bg-[#F0F2F6] font-[Inter,sans-serif] overflow-hidden text-[#0f172a] h-screen fixed inset-0 top-[64px] z-0">
            {/* Context Selector Modal */}
            {showSelector && (
                <BriefSelector
                    onSelect={selectBrief}
                    onClose={() => setShowSelector(false)}
                    currentBriefId={briefId}
                />
            )}

            {/* -- Left: Chat Interface -- */}
            <div className="w-[480px] flex flex-col border-r border-slate-200 bg-white relative shadow-2xl z-20 h-full">

                {/* Header: Context Pill */}
                <div className="h-[72px] border-b border-slate-100 flex items-center justify-between px-6 bg-white z-10 sticky top-0 flex-shrink-0">
                    <button
                        onClick={() => setShowSelector(true)}
                        className={`group flex items-center gap-3 pl-3 pr-4 py-2 rounded-full border transition-all duration-200 max-w-[300px] ${briefContext?.brief
                                ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                                : 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse'
                            }`}
                    >
                        <div className={`w-2.5 h-2.5 flex-shrink-0 rounded-full ${briefContext?.brief ? 'bg-emerald-500 shadow-sm' : 'bg-amber-500'}`}></div>
                        <div className="flex flex-col items-start overflow-hidden text-left">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Context</span>
                            <span className="text-[13px] font-semibold truncate w-full text-slate-800">
                                {briefContext?.brief ? briefContext.brief.name : 'Select Matter...'}
                            </span>
                        </div>
                        <ChevronDown size={14} className="text-slate-400 ml-2 group-hover:text-blue-500 flex-shrink-0" />
                    </button>

                    <button className="p-2.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                        <Settings size={20} />
                    </button>
                </div>

                {/* Chat Stream */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar scroll-smooth bg-gradient-to-b from-white to-slate-50/80">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-[fadeIn_0.3s_ease-out]`}>

                            {/* Avatar */}
                            {msg.role === 'assistant' ? (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white mt-1">
                                    <Sparkles size={18} className="text-white" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1 ring-4 ring-white">
                                    <User size={18} className="text-slate-400" />
                                </div>
                            )}

                            {/* Bubble */}
                            <div className="flex flex-col max-w-[85%]">
                                <div className={`px-6 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm relative ${msg.role === 'assistant'
                                        ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-[0_4px_12px_rgba(0,0,0,0.03)]'
                                        : 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-500/20'
                                    }`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                                </div>
                                <span className={`text-[11px] text-slate-400 mt-2 px-1 font-medium ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    {msg.timestamp}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex gap-4 animate-pulse">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white mt-1">
                                <Bot size={18} className="text-white" />
                            </div>
                            <div className="bg-white border border-slate-200 px-6 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 w-fit h-[54px]">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Composer Input Area */}
                <div className="p-6 bg-white border-t border-slate-100/80 z-20">
                    <div className="relative shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-slate-200 rounded-[28px] bg-white group focus-within:ring-2 focus-within:ring-blue-500/50 transition-all duration-300">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={briefContext?.brief ? "Describe what you need drafted..." : "Select a context above to start."}
                            className="w-full bg-transparent pl-5 pr-5 pt-4 pb-14 min-h-[100px] max-h-[200px] outline-none text-[15px] text-slate-800 resize-none font-medium placeholder-slate-400"
                            disabled={!briefContext?.brief}
                        />

                        {/* ABSOLUTE POSITIONED ACTIONS TO AVOID OVERLAP */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-1">
                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-50 relative group/tooltip">
                                <Paperclip size={20} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-50">
                                <Mic size={20} />
                            </button>
                        </div>

                        <div className="absolute bottom-3 right-3">
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || !briefContext?.brief}
                                className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center shadow-md ${inputValue.trim()
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:scale-105'
                                        : 'bg-slate-100 text-slate-300'
                                    }`}
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-3">
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide">Reforma AI v1.0 • Confidential</span>
                    </div>
                </div>
            </div>

            {/* -- Right: Live Preview Panel -- */}
            <div className="flex-1 bg-[#EEF2F6] flex flex-col overflow-hidden relative shadow-[inset_4px_0_24px_rgba(0,0,0,0.02)] h-full">
                {/* Header */}
                <div className="h-[72px] border-b border-slate-200/60 flex items-center justify-between px-8 bg-white/70 backdrop-blur-xl sticky top-0 z-10 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2.5 rounded-xl text-blue-600 shadow-sm border border-slate-200/60">
                            <FileText size={20} />
                        </div>
                        <div>
                            <div className="text-[15px] font-bold text-slate-800 tracking-tight">{generatedArtifact ? 'Statement of Claim.docx' : 'Drafting Canvas'}</div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${generatedArtifact ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${generatedArtifact ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                </span>
                                {generatedArtifact ? 'Live Sync Active' : 'Waiting for content'}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all">
                            <Copy size={14} /> Copy
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg shadow-md transition-all">
                            <Download size={14} /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Artifact Content */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex justify-center bg-[#EEF2F6]">
                    {renderDocumentObject()}
                </div>
            </div>

        </div>
    );
}
