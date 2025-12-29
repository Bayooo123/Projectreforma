'use client';

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCourtDates } from "@/app/actions/dashboard";

interface CourtDate {
    id: string;
    date: Date | null;
    time: string;
    caseName: string;
    courtLocation: string | null;
    judge: string | null;
    hearingType: string;
}

interface CourtDatesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CourtDatesModal({ isOpen, onClose }: CourtDatesModalProps) {
    const [dates, setDates] = useState<CourtDate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getCourtDates(14).then(data => {
                setDates(data);
                setIsLoading(false);
            });
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="w-[90%] max-w-[700px] max-h-[80vh] bg-surface rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] pointer-events-auto flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-border shrink-0">
                                <h2 className="text-xl font-semibold text-primary">Upcoming Court Dates</h2>
                                <button
                                    onClick={onClose}
                                    className="text-secondary hover:text-primary transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-8 flex flex-col gap-3">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-subtle" />
                                        ))}
                                    </div>
                                ) : dates.length === 0 ? (
                                    <div className="text-center py-12 text-secondary">
                                        No upcoming court dates in the next 14 days.
                                    </div>
                                ) : (
                                    dates.map(date => {
                                        const dateStr = date.date
                                            ? date.date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
                                            : 'TBD';

                                        return (
                                            <div key={date.id} className="p-5 border border-border rounded-[10px] transition-all duration-200 hover:border-teal-text hover:bg-hover-bg">
                                                <div className="inline-block px-3 py-1 bg-[var(--bg-sidebar)] text-white rounded-md text-xs font-semibold mb-3">
                                                    {dateStr} • {date.time}
                                                </div>

                                                <div className="font-semibold text-[15px] text-primary mb-2">
                                                    {date.caseName}
                                                </div>

                                                <div className="flex flex-col gap-1 text-[13px] text-secondary">
                                                    <div>📍 {date.courtLocation || 'Court TBD'}</div>
                                                    <div>⚖️ {date.hearingType}</div>
                                                    <div>👨‍⚖️ {date.judge || 'Judge TBD'}</div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
