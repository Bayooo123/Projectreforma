'use client';

import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, User, Scale } from "lucide-react";
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
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl pointer-events-auto flex flex-col max-h-[85vh]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Upcoming Court Dates</h2>
                                <button
                                    onClick={onClose}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                                        ))}
                                    </div>
                                ) : dates.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground">No upcoming court dates in the next 14 days.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {dates.map(date => (
                                            <div key={date.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition-all duration-200">
                                                {/* Date Badge */}
                                                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-teal-600 text-white shrink-0 shadow-sm">
                                                    <span className="text-xs font-semibold uppercase opacity-80">
                                                        {date.date ? date.date.toLocaleDateString('en-US', { month: 'short' }) : 'TBD'}
                                                    </span>
                                                    <span className="text-xl font-bold">
                                                        {date.date ? date.date.getDate() : '-'}
                                                    </span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-semibold text-slate-900 dark:text-white truncate pr-2">
                                                            {date.caseName}
                                                        </h4>
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                            {date.time}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-y-1 gap-x-4 mt-2">
                                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                                            <MapPin size={14} className="mr-1.5 text-teal-600" />
                                                            <span className="truncate">{date.courtLocation || 'Court TBD'}</span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                                            <User size={14} className="mr-1.5 text-teal-600" />
                                                            <span className="truncate">{date.judge || 'Judge TBD'}</span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 col-span-2">
                                                            <Scale size={14} className="mr-1.5 text-teal-600" />
                                                            <span className="truncate">{date.hearingType}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
