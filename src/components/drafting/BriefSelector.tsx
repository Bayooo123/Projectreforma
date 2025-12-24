"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Check, Briefcase } from 'lucide-react';
import { getUserBriefs } from '@/app/actions/briefs';

interface BriefSelectorProps {
    onSelect: (briefId: string) => void;
    onClose: () => void;
    currentBriefId?: string | null;
}

export default function BriefSelector({ onSelect, onClose, currentBriefId }: BriefSelectorProps) {
    const [query, setQuery] = useState("");
    const [briefs, setBriefs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadBriefs = async () => {
            setIsLoading(true);
            try {
                const data = await getUserBriefs();
                setBriefs(data);
            } catch (err) {
                console.error("Failed to load briefs", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadBriefs();
        // Focus input on mount
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const filteredBriefs = briefs.filter(b =>
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.briefNumber.toLowerCase().includes(query.toLowerCase()) ||
        b.client?.name.toLowerCase().includes(query.toLowerCase())
    );

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredBriefs.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredBriefs.length) % filteredBriefs.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredBriefs[selectedIndex]) {
                    onSelect(filteredBriefs[selectedIndex].id);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredBriefs, selectedIndex, onSelect, onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="command-palette bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Search className="w-5 h-5 text-slate-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            placeholder="Search briefs or type to create new..."
                            className="flex-1 outline-none text-lg text-slate-900 placeholder-slate-400 bg-transparent"
                        />
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                    <div className="p-2">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Loading contexts...</div>
                        ) : filteredBriefs.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                                <Briefcase size={32} className="mb-3 opacity-20" />
                                <p className="text-sm">No briefs found matching "{query}"</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-xs font-semibold text-slate-500 px-3 py-2 uppercase tracking-wider">Recent Briefs</div>
                                {filteredBriefs.map((brief, index) => (
                                    <button
                                        key={brief.id}
                                        onClick={() => onSelect(brief.id)}
                                        className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-center justify-between group ${index === selectedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                                {brief.name}
                                                {currentBriefId === brief.id && <Check size={14} className="text-blue-600" />}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {brief.briefNumber} • {brief.client?.name || 'No Client'}
                                            </div>
                                        </div>
                                        <span className={`text-xs text-slate-400 ${index === selectedIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            Enter
                                        </span>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
                    <div className="flex gap-4">
                        <span><kbd className="px-2 py-1 bg-white border border-slate-200 rounded shadow-sm">↑↓</kbd> Navigate</span>
                        <span><kbd className="px-2 py-1 bg-white border border-slate-200 rounded shadow-sm">Enter</kbd> Select</span>
                    </div>
                    <span><kbd className="px-2 py-1 bg-white border border-slate-200 rounded shadow-sm">Esc</kbd> Close</span>
                </div>
            </div>
        </div>
    );
}
