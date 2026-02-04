"use client";

import { FileText, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Brief {
    id: string;
    briefNumber: string;
    name: string;
    client: { name: string };
    dueDate: Date | null;
    status: string;
}

interface MyBriefsWidgetProps {
    briefs: Brief[];
}

export function MyBriefsWidget({ briefs }: MyBriefsWidgetProps) {
    const formatDate = (date: Date | null) => {
        if (!date) return 'No due date';
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short'
        }).format(new Date(date));
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-all duration-300">
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 tracking-tight">My Briefs</h3>
                        <p className="text-xs font-medium text-slate-500">Recently active</p>
                    </div>
                </div>
                <Link href="/briefs" className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="p-2">
                {briefs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <p className="text-slate-500 text-sm">No active briefs assigned.</p>
                        <Link href="/briefs/new" className="mt-2 text-xs text-blue-600 font-medium hover:underline">
                            Create a new brief
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {briefs.map((brief) => (
                            <Link
                                key={brief.id}
                                href={`/briefs/${brief.id}`}
                                className="block group p-3 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-medium text-slate-800 text-sm group-hover:text-blue-700 transition-colors line-clamp-1">
                                        {brief.name}
                                    </h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${brief.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {brief.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-slate-500 font-medium truncate max-w-[120px]">
                                        {brief.client?.name || 'Unassigned'}
                                    </span>
                                    <div className="flex items-center text-[10px] text-slate-400 font-medium">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {formatDate(brief.dueDate)}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {briefs.length > 0 && (
                <div className="mt-auto border-t border-slate-50 p-3 bg-slate-50/50">
                    <Link href="/briefs" className="block w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                        View all briefs
                    </Link>
                </div>
            )}
        </div>
    );
}
