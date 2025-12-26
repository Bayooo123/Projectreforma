
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { generateDraftAction } from '@/app/actions/drafting';

interface AgentChatProps {
    briefId: string;
    onDraftReceived: (text: string) => void;
}

export function AgentChat({ briefId, onDraftReceived }: AgentChatProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Simple ephemeral chat history for the session
    const [history, setHistory] = useState<{ role: 'user' | 'agent', text: string }[]>([
        { role: 'agent', text: 'I have read the Brief. What would you like me to draft?' }
    ]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        // Call Server Action
        const result = await generateDraftAction(briefId, userMsg);

        setIsLoading(false);

        if (result.success && result.draft) {
            setHistory(prev => [...prev, { role: 'agent', text: 'Draft generated based on the brief facts. CHECK the editor pane.' }]);
            onDraftReceived(result.draft);
        } else {
            setHistory(prev => [...prev, { role: 'agent', text: 'Error generating draft. Please try again.' }]);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-2">
                <div className="bg-teal-100 p-1.5 rounded-md">
                    <Sparkles className="w-4 h-4 text-teal-700" />
                </div>
                <span className="text-sm font-semibold text-slate-700">Studio Agent</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[85%] rounded-2xl px-4 py-3 text-sm
                            ${msg.role === 'user'
                                ? 'bg-slate-900 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-600 rounded-bl-none shadow-sm'}
                        `}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="relative">
                    <Textarea
                        placeholder="E.g., Draft a Motion on Notice..."
                        value={input}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                        className="min-h-[80px] pr-12 resize-none bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <Button
                        size="icon"
                        className="absolute bottom-2 right-2 h-8 w-8 rounded-lg bg-teal-600 hover:bg-teal-700"
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="text-[10px] text-center text-slate-400 mt-2">
                    AI can make mistakes. Reference the Brief manually if unsure.
                </div>
            </div>
        </div>
    );
}
