"use client";

import { useSession } from "next-auth/react";
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import {
    Check,
    Calendar,
    FileText,
} from 'lucide-react';
import { PendingTasksModal } from "@/components/dashboard/PendingTasksModal";
import { CourtDatesModal } from "@/components/dashboard/CourtDatesModal";

interface DashboardClientProps {
    initialData: {
        metrics: {
            pendingTasks: number;
            upcomingHearings: number;
            activeBriefs: number;
            monthlyRevenue: number;
        };
        upcomingHearings: any[];
        firmPulseLogs: any[];
        tasks: any[];
        users: any[];
        myBriefs: any[];
    }
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
    const { data: session } = useSession();
    const user = session?.user;

    // State for Modals & Dropdowns
    const [isPendingTasksOpen, setIsPendingTasksOpen] = useState(false);
    const [isCourtDatesOpen, setIsCourtDatesOpen] = useState(false);
    const [isActiveBriefsOpen, setIsActiveBriefsOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsActiveBriefsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentDate = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date());

    const Card = ({ title, value, subtitle, icon: Icon, onClick, isActive, hasDropdown }: any) => (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-slate-800 rounded-[12px] p-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none transition-all duration-300 relative cursor-pointer
                ${isActive ? 'active ring-2 ring-[#0f5f5a] dark:ring-teal-500' : 'hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[2px] dark:hover:bg-slate-750'}
            `}
        >
            <div className="flex justify-between items-start mb-[20px]">
                <div>
                    <div className="text-[14px] text-[#718096] dark:text-slate-400 uppercase tracking-[0.5px] font-semibold mb-[8px]">{title}</div>
                    <div className="text-[48px] font-bold text-[#1a202c] dark:text-slate-100 leading-none mb-[8px]">{value}</div>
                    <div className="text-[13px] text-[#0f5f5a] dark:text-teal-400 font-medium">{subtitle}</div>
                </div>
                <div className="w-[48px] h-[48px] rounded-[12px] bg-[#e6f7f5] dark:bg-teal-900/30 text-[#0f5f5a] dark:text-teal-400 flex items-center justify-center text-[20px]">
                    {typeof Icon === 'string' ? Icon : <Icon size={24} strokeWidth={2} />}
                </div>
            </div>

            {/* Dropdown Content */}
            {hasDropdown && isActive && (
                <div className="absolute top-full left-0 right-0 mt-[8px] bg-white dark:bg-slate-800 rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-[10] max-h-[400px] overflow-y-auto block border border-slate-100 dark:border-slate-700">
                    {initialData.myBriefs.length === 0 ? (
                        <div className="p-5 text-center text-[#718096] dark:text-slate-400 text-sm">No active briefs</div>
                    ) : (
                        initialData.myBriefs.slice(0, 8).map((brief: any) => (
                            <Link href={`/briefs/${brief.id}`} key={brief.id}>
                                <div className="p-[16px] px-[20px] border-b border-[#e2e8f0] dark:border-slate-700 last:border-b-0 cursor-pointer transition-colors duration-200 hover:bg-[#f8fffe] dark:hover:bg-slate-700/50">
                                    <div className="font-semibold text-[#1a202c] dark:text-slate-200 text-[14px] mb-[4px]">{brief.name}</div>
                                    <div className="text-[12px] text-[#718096] dark:text-slate-400">Updated {formatTimeAgo(new Date(brief.updatedAt))}</div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="p-[40px] max-w-[1400px] mx-auto">
            {/* Greeting Section */}
            <div className="mb-[8px]">
                <h1 className="text-[32px] font-semibold text-[#1a202c] dark:text-slate-100">
                    Good morning, {user?.name?.split(' ')[0] || 'Counsel'}
                </h1>
            </div>
            <div className="text-[#718096] dark:text-slate-400 text-[14px] mb-[40px] uppercase tracking-[0.5px]">
                {currentDate}
            </div>

            {/* Dashboard Grid - 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px] mb-[32px]">
                <Card
                    title="Pending Tasks"
                    value={initialData.metrics.pendingTasks}
                    subtitle="From Brief Manager"
                    icon="✓"
                    onClick={() => setIsPendingTasksOpen(true)}
                />
                <Card
                    title="Court Dates"
                    value={initialData.metrics.upcomingHearings}
                    subtitle="Next 7 Days"
                    icon="📅"
                    onClick={() => setIsCourtDatesOpen(true)}
                />

                {/* Active Briefs with Dropdown */}
                <div ref={dropdownRef} className="relative z-10 w-full h-full">
                    <Card
                        title="Active Briefs"
                        value={initialData.metrics.activeBriefs}
                        subtitle="In Progress"
                        icon="📄"
                        onClick={() => setIsActiveBriefsOpen(!isActiveBriefsOpen)}
                        isActive={isActiveBriefsOpen}
                        hasDropdown={true}
                    />
                </div>
            </div>

            {/* Main Section - Firm Pulse */}
            <div className="bg-white dark:bg-slate-800 rounded-[12px] p-[32px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none transition-colors duration-300">
                <div className="flex justify-between items-center mb-[28px]">
                    <div className="text-[24px] font-semibold text-[#1a202c] dark:text-slate-100">Firm Pulse</div>
                    <div className="inline-flex items-center gap-[8px] text-[#10b981] dark:text-emerald-400 text-[13px] font-semibold px-[16px] py-[8px] bg-[#ecfdf5] dark:bg-emerald-900/20 rounded-[20px]">
                        <div className="w-[8px] h-[8px] rounded-full bg-[#10b981] dark:bg-emerald-500 animate-pulse"></div>
                        LIVE
                    </div>
                </div>

                <div className="flex flex-col gap-0">
                    {initialData.firmPulseLogs.length === 0 ? (
                        <div className="text-center py-16 px-5 text-[#718096] dark:text-slate-500">
                            <div className="text-5xl mb-4 opacity-30">📊</div>
                            <div className="text-base font-semibold text-[#1a202c] dark:text-slate-300 mb-2">No recent activity</div>
                            <div className="text-sm">Activity will appear here as your team works</div>
                        </div>
                    ) : (
                        initialData.firmPulseLogs.map((log: any) => (
                            <div key={log.id} className="py-[24px] border-b border-[#f1f5f9] dark:border-slate-700 last:border-b-0 hover:bg-[#f8fffe] dark:hover:bg-slate-700/30 hover:-mx-[32px] hover:px-[32px] transition-all duration-200 group flex gap-[20px]">
                                <div className="flex flex-col items-center gap-[8px]">
                                    <div className="w-[12px] h-[12px] rounded-full bg-[#0f5f5a] dark:bg-teal-500 flex-shrink-0"></div>
                                    <div className="w-[2px] flex-1 bg-[#e2e8f0] dark:bg-slate-700 group-last:hidden"></div>
                                </div>
                                <div className="flex-1 pt-[2px]">
                                    <div className="font-bold text-[#1a202c] dark:text-slate-200 text-[16px] mb-[8px]">
                                        {log.matter?.title || log.courtCase?.name || log.brief?.name || 'General Activity'}
                                    </div>
                                    <div className="text-[15px] text-[#4a5568] dark:text-slate-400 leading-[1.6] mb-[8px]">
                                        <span className="font-semibold text-[#0f5f5a] dark:text-teal-400">{log.user?.name || log.performedBy || 'System'}</span>
                                        {' '}
                                        {/* Lowercase the first letter of description to flow with name */}
                                        {log.description.charAt(0).toLowerCase() + log.description.slice(1)}
                                    </div>
                                    <div className="text-[13px] text-[#a0aec0] dark:text-slate-500 font-medium">
                                        {formatTime(new Date(log.timestamp))} • {formatDateShort(new Date(log.timestamp))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            <PendingTasksModal
                isOpen={isPendingTasksOpen}
                onClose={() => setIsPendingTasksOpen(false)}
                tasks={initialData.tasks}
            />

            <CourtDatesModal
                isOpen={isCourtDatesOpen}
                onClose={() => setIsCourtDatesOpen(false)}
                hearings={initialData.upcomingHearings}
            />

        </div>
    );
}

function formatTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
}

function formatTime(date: Date) {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(date);
}

function formatDateShort(date: Date) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
