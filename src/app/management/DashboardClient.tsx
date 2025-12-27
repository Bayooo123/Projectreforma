"use client";

import { useSession } from "next-auth/react";
import Link from 'next/link';
import {
    Check,
    Calendar,
    FileText,
    Activity,
    Zap,
    UserPlus,
    FilePlus,
    BarChart2,
    ArrowRight
} from 'lucide-react';

interface DashboardClientProps {
    initialData: {
        metrics: {
            pendingTasks: number;
            upcomingHearings: number; // Count for metric
            activeBriefs: number;
            monthlyRevenue: number;
        };
        upcomingHearings: any[];
        firmPulseLogs: any[];
        tasks: any[]; // Kept for future use if needed
        users: any[];
        myBriefs: any[]; // Kept for data availability
    }
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
    const { data: session } = useSession();
    const user = session?.user;

    const currentDate = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date());

    const Card = ({ title, value, subtitle, icon: Icon }: any) => (
        <div className="bg-white rounded-xl p-7 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300">
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
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-100 fill-mode-both">
                <Card
                    title="Pending Tasks"
                    value={initialData.metrics.pendingTasks}
                    subtitle="Requires Action"
                    icon={Check}
                />
                <Card
                    title="Court Dates"
                    value={initialData.metrics.upcomingHearings}
                    subtitle="Next 7 Days"
                    icon={Calendar}
                />
                <Card
                    title="Active Briefs"
                    value={initialData.metrics.activeBriefs}
                    subtitle="In Progress"
                    icon={FileText}
                />
            </div>

            {/* Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both">

                {/* Large Card 1: Upcoming Hearings + Quick Actions */}
                <div className="bg-white rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-xl font-semibold text-slate-800">Upcoming Hearings</div>
                        <Link href="/calendar" className="text-teal-800 text-sm font-medium hover:opacity-70 transition-opacity">
                            View Calendar →
                        </Link>
                    </div>

                    {initialData.upcomingHearings.length === 0 ? (
                        <div className="text-center py-10 px-5 text-slate-500 border border-dashed border-slate-200 rounded-xl mb-8">
                            <div className="text-5xl mb-4 opacity-30 mx-auto w-fit">📅</div>
                            <div className="text-base font-semibold text-slate-600 mb-2">No hearings this week</div>
                            <div className="text-sm mb-6">Your calendar is clear. Enjoy the focus time.</div>
                            <Link href="/calendar">
                                <button className="bg-[#0f5f5a] text-white border-0 py-3 px-6 rounded-lg font-semibold cursor-pointer transition-all duration-200 text-sm hover:bg-[#0d4d49] hover:-translate-y-px hover:shadow-lg shadow-teal-900/20">
                                    Schedule Hearing
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 mb-8">
                            {initialData.upcomingHearings.slice(0, 3).map((hearing: any) => (
                                <div key={hearing.id} className="p-5 border border-slate-200 rounded-xl hover:border-[#0f5f5a] hover:bg-[#f8fffe] transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-slate-800 text-[15px] mb-1 group-hover:text-[#0f5f5a] transition-colors">{hearing.title}</div>
                                            <div className="text-sm text-slate-500">
                                                {new Date(hearing.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} at {new Date(hearing.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                                            Upcoming
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="text-base font-semibold text-slate-800 mb-3">Quick Actions</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Link href="/drafting" className="p-4 border border-slate-200 rounded-lg bg-white text-left cursor-pointer transition-all duration-200 text-sm font-medium text-slate-800 hover:border-[#0f5f5a] hover:bg-[#f8fffe] flex items-center gap-3">
                                <Zap size={16} className="text-amber-500" />
                                Draft Motion
                            </Link>
                            <Link href="/management/clients" className="p-4 border border-slate-200 rounded-lg bg-white text-left cursor-pointer transition-all duration-200 text-sm font-medium text-slate-800 hover:border-[#0f5f5a] hover:bg-[#f8fffe] flex items-center gap-3">
                                <UserPlus size={16} className="text-blue-500" />
                                Add Client
                            </Link>
                            <Link href="/briefs" className="p-4 border border-slate-200 rounded-lg bg-white text-left cursor-pointer transition-all duration-200 text-sm font-medium text-slate-800 hover:border-[#0f5f5a] hover:bg-[#f8fffe] flex items-center gap-3">
                                <FilePlus size={16} className="text-emerald-500" />
                                File Brief
                            </Link>
                            <Link href="/analytics" className="p-4 border border-slate-200 rounded-lg bg-white text-left cursor-pointer transition-all duration-200 text-sm font-medium text-slate-800 hover:border-[#0f5f5a] hover:bg-[#f8fffe] flex items-center gap-3">
                                <BarChart2 size={16} className="text-purple-500" />
                                View Reports
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Large Card 2: Firm Pulse */}
                <div className="bg-white rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)] h-full min-h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-xl font-semibold text-slate-800">Firm Pulse</div>
                        <div className="inline-flex items-center gap-1.5 text-emerald-500 text-[13px] font-bold">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            LIVE
                        </div>
                    </div>

                    {initialData.firmPulseLogs.length === 0 ? (
                        <div className="text-center py-10 px-5 text-slate-400 flex flex-col items-center justify-center flex-1">
                            <div className="text-5xl mb-4 opacity-30">📊</div>
                            <div className="text-base font-semibold text-slate-600 mb-2">No recent activity</div>
                            <div className="text-sm">Activity will appear here as your team works</div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5 overflow-y-auto max-h-[600px] pr-2 -mr-2 custom-scrollbar">
                            {initialData.firmPulseLogs.map((log: any) => (
                                <div key={log.id} className="flex gap-3 items-start">
                                    <div className="w-2 h-2 rounded-full bg-[#0f5f5a] mt-1.5 shrink-0 opacity-60"></div>
                                    <div>
                                        <div className="text-sm text-slate-800 mb-1 leading-snug">
                                            <span className="font-semibold">{log.user?.name || log.performedBy || 'System'}</span>
                                            {' '}{log.description}{' '}
                                            <span className="font-medium text-slate-600">
                                                {log.matter?.title || log.brief?.name || ''}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {formatTimeAgo(new Date(log.timestamp))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
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
