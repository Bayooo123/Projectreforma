"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Send, Loader2 } from 'lucide-react';
import { logBriefActivity } from '@/app/actions/brief-activity';
// Note: In real app, we might use toast for success/error

interface BriefActivityLogInputProps {
    briefId: string;
}

export function BriefActivityLogInput({ briefId }: BriefActivityLogInputProps) {
    const [logText, setLogText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!logText.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await logBriefActivity(briefId, logText);
            if (result.success) {
                setLogText('');
            } else {
                // handle error silently or with toast
                console.error("Failed to log activity");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                Activity Log
            </h3>
            <div className="relative">
                <Textarea
                    placeholder="What are you working on for this brief?"
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    className="min-h-[80px] pr-12 resize-none bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />
                <div className="absolute bottom-3 right-3">
                    <Button
                        size="sm"
                        className="h-8 w-8 rounded-full p-0 bg-teal-600 hover:bg-teal-700"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !logText.trim()}
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                            <Send className="h-4 w-4 text-white ml-0.5" />
                        )}
                    </Button>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-right">
                Press Enter to submit
            </p>
        </div>
    );
}
