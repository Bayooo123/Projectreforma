'use client';

import React, { useState } from 'react';
import { Send, Bot, FileText, ChevronRight, ChevronLeft, Paperclip, Sparkles } from 'lucide-react';
import { searchBriefContext } from '@/app/actions/ai-copilot';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    context?: string[]; // Snippets used for RAG
}

interface CopilotWorkspaceProps {
    briefId: string;
    briefName: string;
    initialContent?: string;
}

export default function CopilotWorkspace({ briefId, briefName, initialContent = '' }: CopilotWorkspaceProps) {
    // Layout State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Editor State
    const [editorContent, setEditorContent] = useState(initialContent);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `Hello! I'm your Legal Copilot for **${briefName}**. I've indexed all documents in this brief. How can I help you draft today?`
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // 1. Retrieve Context (RAG)
            // In a real flow, this would be part of a single "chat" action, but we split it here for visibility
            const contextResult = await searchBriefContext(briefId, userMsg.content);
            const contextSnippets = contextResult.success
                ? (contextResult.context as any[]).map(c => c.content)
                : [];

            // 2. Generate Response (Mocked here, but would call separate LLM action)
            // For now, we simulate the "reasoning" based on context
            const responseText = contextSnippets.length > 0
                ? `Based on the documents, here is what I found:\n\n${contextSnippets[0].substring(0, 200)}...\n\nI can draft a clause based on this.`
                : "I couldn't find specific documents matching that query, but I can still help draft general clauses.";

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                context: contextSnippets
            };

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: "Sorry, I encountered an error searching the brief." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* LEFT PANE: Chat Interface (The "Strategist") */}
            <div
                className={`transition-all duration-300 ease-in-out border-r border-gray-200 bg-white flex flex-col ${isSidebarOpen ? 'w-[400px]' : 'w-0 opacity-0 overflow-hidden'}`}
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <Sparkles size={18} className="text-teal-600" />
                        <span>Copilot</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'}`}>
                                {msg.role === 'assistant' ? <Bot size={16} /> : <div className="text-xs font-bold">You</div>}
                            </div>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-slate-800 text-white rounded-tr-none'
                                    : 'bg-white border border-gray-200 shadow-sm rounded-tl-none text-slate-700'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                {msg.context && msg.context.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-gray-100">
                                        <p className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1">
                                            <FileText size={10} /> Referenced Context
                                        </p>
                                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-gray-100 italic truncate">
                                            "{msg.context[0].substring(0, 50)}..."
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white border border-gray-200 shadow-sm p-3 rounded-2xl rounded-tl-none">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Ask specific questions or request drafting..."
                            className="w-full resize-none bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all custom-scrollbar"
                            rows={3}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="absolute bottom-3 right-3 p-1.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <Paperclip size={12} /> Attach additional context
                        </span>
                        <span>Shift + Enter for new line</span>
                    </div>
                </div>
            </div>

            {/* Toggle Sidebar Button (When closed) */}
            {!isSidebarOpen && (
                <div className="absolute left-4 top-20 z-10">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 bg-white border border-gray-200 shadow-md rounded-full text-slate-500 hover:text-teal-600 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* RIGHT PANE: Editor (The "Artifact") */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
                <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
                    <div className="flex items-center gap-3">
                        {isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 transition-colors"
                                title="Hide Chat"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        )}
                        <h1 className="font-semibold text-slate-800">{briefName || 'Untitled Brief'}</h1>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full border border-slate-200">Draft</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Autosaved</span>
                        <button className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 flex justify-center">
                    <div className="w-full max-w-[850px] bg-white shadow-sm border border-gray-200 min-h-[1000px] p-12 rounded-sm">
                        <textarea
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.value)}
                            className="w-full h-full resize-none focus:outline-none text-slate-800 leading-relaxed font-serif"
                            placeholder="Start drafting here..."
                            style={{ minHeight: '900px' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
