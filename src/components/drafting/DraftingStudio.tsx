"use client";

import { useState, useEffect, useRef } from 'react';
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

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSelector(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
                    content: `Good afternoon. I've loaded the context for **${foundContext.brief.name}**. \n\nI detect this is a **Personal Injury** matter. Would you like me to draft a *Statement of Claim*, or should we review the medical reports first?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } else {
            setMessages([
                {
                    id: 1,
                    role: 'assistant',
                    content: `Welcome to Drafting Studio. Please select a brief to provide context for our session.`,
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

            if (lowerText.includes("draft") || lowerText.includes("claim") || lowerText.includes("soc")) {
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
                responseText = `I'll draft a Statement of Claim based on the facts in **${briefContext.brief.name}**. I'm structuring it with:\n\n*   Parties identification\n*   Factual background of the accident\n*   Grounds for liability\n*   Damages claimed\n\nWatch the document form in the preview panel.`;
            }
            else if (lowerText.includes("negligence") || lowerText.includes("duty")) {
                responseText = "I've added a section on negligence and duty of care, specifically citing the standard of the reasonable driver.";
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
                <div className="flex flex-col items-center justify-center h-full select-none opacity-50">
                    <div className="w-16 h-16 bg-slate-200 rounded-full mb-4 animate-pulse"></div>
                    <p className="text-slate-400 font-medium">Waiting for drafting instructions...</p>
                </div>
            );
        }

        return (
            <div className="bg-white paper-shadow rounded-lg p-12 legal-document min-h-[1100px] w-full max-w-3xl mx-auto text-slate-900">
                {/* Court Header */}
                <div className="text-center mb-8 border-b-2 border-slate-900 pb-4">
                    <div className="font-bold text-sm mb-1 uppercase">Ontario</div>
                    <div className="font-bold text-sm uppercase">Superior Court of Justice</div>
                </div>

                {/* Court File */}
                <div className="mb-6">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr>
                                <td className="w-1/2 pr-8 align-top">BETWEEN:</td>
                                <td className="text-right align-top">Court File No. CV-24-00123456-0000</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Parties */}
                <div className="mb-8">
                    <div className="text-center font-bold mb-6">
                        <div className="mb-2 uppercase">{answers['claimant_name'] || 'JOHN SMITH'}</div>
                        <div className="text-sm font-normal italic mb-4">Plaintiff</div>
                        <div className="mb-4">- and -</div>
                        <div className="mb-2 uppercase">{answers['defendant_name'] || 'ROBERT JOHNSON'}</div>
                        <div className="text-sm font-normal italic">Defendant</div>
                    </div>
                </div>

                {/* Document Title */}
                <div className="text-center font-bold text-lg mb-8 underline">
                    STATEMENT OF CLAIM
                </div>

                {/* Content */}
                <div className="space-y-4 text-sm leading-relaxed text-justify">
                    <p><span className="font-bold">1.</span> The Plaintiff claims:</p>
                    <div className="ml-8 space-y-2">
                        <p>(a) General damages in the amount of $250,000;</p>
                        <p>(b) Special damages in the amount of $45,000;</p>
                        <p>(c) Pre-judgment and post-judgment interest in accordance with the Courts of Justice Act;</p>
                        <p>(d) Costs of this action on a substantial indemnity basis; and</p>
                        <p>(e) Such further and other relief as this Honourable Court deems just.</p>
                    </div>

                    <p className="pt-4"><span className="font-bold">2.</span> The Plaintiff is {answers['claimant_type'] === 'company' ? 'a corporation' : 'an individual'} residing in Toronto, Ontario.</p>

                    <p><span className="font-bold">3.</span> The Defendant is, to the best of the Plaintiff's knowledge, an individual residing in Toronto, Ontario.</p>

                    <p><span className="font-bold">4.</span> On or about June 15, 2023, at approximately 3:30 p.m., the Plaintiff was lawfully operating his motor vehicle in a westbound direction on King Street West in Toronto, Ontario.</p>

                    <p><span className="font-bold">5.</span> At the said time and place, the Defendant negligently operated his motor vehicle and collided with the Plaintiff's vehicle at the intersection of King Street West and Spadina Avenue.</p>

                    <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400 font-[Inter]">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-600 mt-0.5">✨</div>
                            <div className="text-xs">
                                <div className="font-semibold text-blue-900 mb-1">AI is drafting section on negligence...</div>
                                <div className="text-blue-700">Adding paragraphs 6-8 detailing duty of care and breach based on the Highway Traffic Act.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-100 font-[Inter,sans-serif] overflow-hidden fixed inset-0 top-0 z-0">
            {/* Command Palette Modal (Hidden by default or managed by state) */}
            {showSelector && (
                <BriefSelector
                    onSelect={selectBrief}
                    onClose={() => setShowSelector(false)}
                    currentBriefId={briefId}
                />
            )}

            {/* LEFT PANEL: Chat Interface (The Brain/Strategist) */}
            <div className="w-1/2 flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 border-r border-slate-200">

                {/* Glassmorphic Header (Sticky) */}
                <div className="glassmorphic sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between mb-3">
                            <h1 className="text-2xl font-bold text-slate-900">Drafting Studio</h1>
                            <button className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 font-medium shadow-sm">
                                Settings
                            </button>
                        </div>

                        {/* Context Pill */}
                        <button
                            onClick={() => setShowSelector(true)}
                            className={`w-full flex items-center gap-3 px-4 py-3 border-2 rounded-xl transition-all group text-left ${briefContext?.brief
                                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                    : 'bg-white border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${briefContext?.brief ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                            <div className="flex-1">
                                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                    {briefContext?.brief ? 'Active Brief' : 'No Context'}
                                </div>
                                <div className={`font-semibold ${briefContext?.brief ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                                    {briefContext?.brief ? briefContext.brief.name : 'Select a brief to begin...'}
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} chat-bubble-enter`}>
                            <div className={`max-w-[85%] px-5 py-3 shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md shadow-lg shadow-blue-900/10'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-md sparkle'
                                }`}>
                                <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') }} />
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex justify-start chat-bubble-enter">
                            <div className="max-w-[80%] bg-white border border-slate-100 rounded-2xl rounded-tl-md px-5 py-3 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-sm text-slate-500">Drafting...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-200 bg-white px-6 py-4 z-20">
                    <div className="relative">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Describe what you want to draft or modify..."
                            className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl resize-none focus:outline-none focus:border-blue-400 transition-colors bg-slate-50 focus:bg-white text-slate-800"
                            rows={3}
                            disabled={!briefContext?.brief}
                        ></textarea>
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim()}
                            className={`absolute right-3 bottom-3 p-2 rounded-lg transition-colors shadow-lg ${inputValue.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                        <span>Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-sans">Cmd+K</kbd> for brief selector</span>
                        <span>{inputValue.length} / 2000</span>
                    </div>
                </div>

            </div>

            {/* RIGHT PANEL: Live Preview (The Canvas/Output) */}
            <div className="w-1/2 bg-slate-50 border-l border-slate-200 overflow-y-auto p-8 custom-scrollbar">
                {renderDocumentObject()}

                {/* Document Metadata Footer */}
                {generatedArtifact && (
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 max-w-3xl mx-auto px-12">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Auto-saved just now</span>
                        </div>
                        <span>Last modified by AI • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                )}
            </div>

        </div>
    );
}
