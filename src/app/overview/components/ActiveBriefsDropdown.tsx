'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getMyBriefs } from "@/app/actions/dashboard";
import Link from "next/link";
import { Loader2 } from "lucide-react";

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
                    className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden max-h-[400px] overflow-y-auto border border-slate-100 dark:border-slate-700"
                    style={{ minWidth: '300px' }}
                >
                    <div>
                        {isLoading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin text-slate-400" size={20} />
                            </div>
                        ) : briefs.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No active briefs found.
                            </div>
                        ) : (
                            briefs.map(brief => (
                                <Link
                                    key={brief.id}
                                    href={`/briefs`}
                                    className="block p-5 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-[#f8fffe] dark:hover:bg-slate-700/30 transition-colors cursor-pointer text-left w-full"
                                >
                                    <div className="font-semibold text-[#1a202c] dark:text-white text-[14px] mb-[4px]">
                                        {brief.name}
                                    </div>
                                    <div className="text-[12px] text-[#718096] dark:text-slate-400">
                                        Updated {new Date(brief.updatedAt).toLocaleDateString()}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
