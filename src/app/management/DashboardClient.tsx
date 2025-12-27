"use client";

import { useSession } from "next-auth/react";
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import {
    Check,
    Calendar,
    FileText,
    Activity,
    Zap,
    UserPlus,
    FilePlus,
    BarChart2,
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
            className={`bg-white rounded-xl p-7 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300 relative cursor-pointer
                ${isActive ? '' : 'hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5'}
            `}
        >
            <div className="flex justify-between items-start mb-5">
                <div>
                    <div className="text-sm text-slate-500 uppercase tracking-wide font-semibold mb-2">{title}</div>
                    <div className="text-5xl font-bold text-slate-800 leading-none mb-2">{value}</div>
                    <div className="text-[13px] text-teal-800 font-medium">{subtitle}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#e6f7f5] text-[#0f5f5a] flex items-center justify-center">
                    <Icon size={20} strokeWidth={2.5} />
                </div>
            </div>

            {/* Dropdown Content */}
            {hasDropdown && isActive && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] z-20 max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    {initialData.myBriefs.length === 0 ? (
                        <div className="p-5 text-center text-slate-500 text-sm">No active briefs</div>
                    ) : (
                        initialData.myBriefs.slice(0, 8).map((brief: any) => (
                            <Link href={`/briefs/${brief.id}`} key={brief.id}>
                                <div className="p-4 border-b border-slate-100 last:border-0 hover:bg-[#f8fffe] transition-colors group">
                                    <div className="font-semibold text-slate-800 text-sm mb-1 group-hover:text-[#0f5f5a]">{brief.name}</div>
                                    <div className="text-xs text-slate-400">Updated {formatTimeAgo(new Date(brief.updatedAt))}</div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-12">
            {/* Greeting Section */}
            <div className="mb-10 animate-in fade-in slide-in-from-top-2 duration-700">
                <h1 className="text-3xl font-semibold text-slate-800 mb-2">
                    Good morning, {user?.name?.split(' ')[0] || 'Counsel'}
                </h1>
                <div className="text-slate-500 text-sm uppercase tracking-wide font-medium">
                    {currentDate}
                </div>
            </div>

            {/* Dashboard Grid - 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-100 fill-mode-both">
                <Card
                    title="Pending Tasks"
                    value={initialData.metrics.pendingTasks}
                    subtitle="Requires Action"
                    icon={Check}
                    onClick={() => setIsPendingTasksOpen(true)}
                />
                <Card
                    title="Court Dates"
                    value={initialData.metrics.upcomingHearings}
                    subtitle="Next 7 Days"
                    icon={Calendar}
                    onClick={() => setIsCourtDatesOpen(true)}
                />

                {/* Active Briefs with Dropdown */}
                <div ref={dropdownRef} className="relative z-10">
                    <Card
                        title="Active Briefs"
                        value={initialData.metrics.activeBriefs}
                        subtitle="In Progress"
                        icon={FileText}
                        onClick={() => setIsActiveBriefsOpen(!isActiveBriefsOpen)}
                        isActive={isActiveBriefsOpen}
                        hasDropdown={true}
                    />
                </div>
            </div>

            {/* Firmware Pulse Section - Full Width */}
            <div className="bg-white rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both">
                <div className="flex justify-between items-center mb-8">
                    <div className="text-2xl font-semibold text-slate-800">Firm Pulse</div>
                    <div className="inline-flex items-center gap-2 text-emerald-500 text-[13px] font-semibold px-4 py-2 bg-emerald-50 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        LIVE
                    </div>
                </div>

                <div className="flex flex-col">
                    {initialData.firmPulseLogs.length === 0 ? (
                        <div className="text-center py-16 px-5 text-slate-400">
                            <div className="text-5xl mb-4 opacity-30">📊</div>
                            <div className="text-base font-semibold text-slate-600 mb-2">No recent activity</div>
                            <div className="text-sm">Activity will appear here as your team works</div>
                        </div>
                    ) : (
                        initialData.firmPulseLogs.map((log: any) => (
                            <div key={log.id} className="py-6 border-b border-slate-100 last:border-0 hover:bg-[#f8fffe] hover:-mx-8 hover:px-8 transition-all duration-200 group flex gap-5 items-start">
                                <div className="flex flex-col items-center gap-2 mt-1 shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-[#0f5f5a]"></div>
                                    <div className="w-0.5 h-full bg-slate-200 group-last:hidden"></div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <div className="font-bold text-slate-800 text-base mb-2">
                                        {log.matter?.name || log.brief?.name || 'General Activity'}
                                    </div>
                                    <div className="text-[15px] text-slate-600 leading-normal mb-2">
                                        <span className="font-semibold text-[#0f5f5a]">{log.performedBy || 'System'}</span>
                                        {' '}
                                        {/* Normalize description to lowercase but ensure first letter isn't if it's a name, though CSS text-transform is safer if we want strict lowercase. Design shows normal case sentences. */}
                                        {log.description}
                                    </div>
                                    <div className="text-[13px] text-slate-400 font-medium">
                                        {formatTime(new Date(log.timestamp))} • {formatDate(new Date(log.timestamp))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Actions (Keep generic or hidden if only modals requested? User asked for THIS HTML which didn't show the quick actions at bottom, but we can keep them or remove depending on strictness. The user said "this is what i want...". The shared HTML DOES NOT have the 2-column layout with quick actions anymore. It has a single Firmware Pulse section. I will stick to the provided HTML structure.) */}

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

function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
