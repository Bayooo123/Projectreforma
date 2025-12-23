"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Briefcase, FileText, Check, X, Filter } from 'lucide-react';
import { getUserBriefs } from '@/app/actions/briefs';
import { motion, AnimatePresence } from 'framer-motion';

interface BriefSelectorProps {
    onSelect: (briefId: string) => void;
    onClose: () => void;
    currentBriefId?: string | null;
}

export default function BriefSelector({ onSelect, onClose, currentBriefId }: BriefSelectorProps) {
    const [query, setQuery] = useState("");
    const [briefs, setBriefs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/20 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            >
                {/* Search Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <Search className="text-gray-400" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for a brief to simulate (e.g. 'Krown v. Kat')..."
                        className="flex-1 text-lg outline-none text-gray-800 placeholder-gray-400 font-medium bg-transparent"
                    />
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                        <span className="sr-only">Close</span>
                        <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-md shadow-sm">ESC</kbd>
                    </button>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-gray-50/30">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Loading contexts...</div>
                    ) : filteredBriefs.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-gray-400 empty-state">
                            <Briefcase size={32} className="mb-3 opacity-20" />
                            <p className="text-sm">No briefs found matching "{query}"</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Recent Matters</span>
                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{filteredBriefs.length} found</span>
                            </div>

                            {filteredBriefs.map(brief => (
                                <button
                                    key={brief.id}
                                    onClick={() => onSelect(brief.id)}
                                    className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all group ${currentBriefId === brief.id
                                            ? 'bg-blue-50 border border-blue-100 shadow-sm'
                                            : 'hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100'
                                        }`}
                                >
                                    <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${currentBriefId === brief.id ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-sm font-semibold truncate ${currentBriefId === brief.id ? 'text-blue-900' : 'text-gray-900'}`}>
                                                {brief.name}
                                            </span>
                                            {currentBriefId === brief.id && <Check size={16} className="text-blue-600" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{brief.briefNumber}</span>
                                            <span>•</span>
                                            <span className="truncate max-w-[150px]">{brief.client?.name || 'No Client'}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-400 flex items-center justify-between px-6">
                    <span>ProTip: Use arrows to navigate, Enter to select</span>
                    <span className="flex items-center gap-1"><Filter size={10} /> Filter by Category available in Pro</span>
                </div>
            </motion.div>
        </div>
    );
}
