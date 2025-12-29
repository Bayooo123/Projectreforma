'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getMyBriefs } from "@/app/actions/dashboard";
import Link from "next/link";
import { FileText, ArrowRight, Loader2 } from "lucide-react";

interface Brief {
    id: string;
    briefNumber: string;
    name: string;
    updatedAt: Date;
}

interface ActiveBriefsDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLDivElement | null>;
}

export function ActiveBriefsDropdown({ isOpen, onClose, anchorRef }: ActiveBriefsDropdownProps) {
    const [briefs, setBriefs] = useState<Brief[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getMyBriefs(5).then(data => {
                setBriefs(data);
                setIsLoading(false);
            });
        }
    }, [isOpen]);

    // Handle outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose, anchorRef]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-50 mt-2 w-full origin-top rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 left-0"
                    style={{
                        // Ensure it aligns with the card width
                        width: anchorRef.current?.offsetWidth || '100%',
                    }}
                >
                    <div className="p-2">
                        {isLoading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin text-slate-400" size={20} />
                            </div>
                        ) : briefs.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No active briefs found.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {briefs.map(brief => (
                                    <Link
                                        key={brief.id}
                                        href={`/briefs`}
                                        className="group flex items-center justify-between rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                                                <FileText size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900 truncate dark:text-white text-sm">
                                                    {brief.name}
                                                </p>
                                                <p className="text-xs text-slate-500 font-mono">
                                                    {brief.briefNumber}
                                                </p>
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-400" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
