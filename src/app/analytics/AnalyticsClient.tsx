"use client";

import { useState } from 'react';
import { 
    AlertTriangle, 
    ArrowUp, 
    TrendingDown, 
    Users, 
    Briefcase, 
    Calendar, 
    DollarSign,
    Target,
    Activity,
    ChevronRight,
    Search,
    Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PinProtection } from '@/components/auth/PinProtection';

interface AnalyticsData {
    metrics: any;
    revenueTrend: { month: string; amount: number }[];
    topClients: any[];
    lawyerStats: any[];
    matterDistribution: { status: string; count: number }[];
    courtVisits: { court: string; count: number }[];
}

interface AnalyticsClientProps {
    data: AnalyticsData;
    workspaceId: string;
    initialFilter: string;
}

export default function AnalyticsClient({ data, workspaceId, initialFilter }: AnalyticsClientProps) {
    const [filter, setFilter] = useState(initialFilter);
    const router = useRouter();

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        router.push(`/analytics?filter=${newFilter}`);
    };

    const formatCurrency = (amount: number) => {
        return `₦${((amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const { metrics, revenueTrend, topClients, lawyerStats, matterDistribution, courtVisits } = data;

    // Defensive Max Revenue for Chart
    const maxRevenue = Math.max(...revenueTrend.map((d: any) => d.amount || 0), 1000);

    // Dynamic Chart Points with NaN Protection
    const getChartPoints = () => {
        if (revenueTrend.length < 2) return "";
        return revenueTrend.map((d: any, i: number) => {
            const x = (i / (revenueTrend.length - 1)) * 100;
            const y = 100 - ((d.amount || 0) / maxRevenue) * 80;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return "0,0";
            return `${x},${y}`;
        }).join(' ');
    };

    const pieColors = ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0'];
    const totalMatters = (matterDistribution || []).reduce((acc: number, curr: any) => acc + (curr.count || 0), 0) || 1;
    
    const matterGradient = matterDistribution.length > 0
        ? `conic-gradient(${matterDistribution.map((d: any, i: number) => {
            const start = matterDistribution.slice(0, i).reduce((sum: number, prev: any) => sum + (prev.count || 0), 0) / totalMatters * 100;
            const end = start + ((d.count || 0) / totalMatters * 100);
            return `${pieColors[i % pieColors.length]} ${start}% ${end}%`;
        }).join(', ')})`
        : 'conic-gradient(#E2E8F0 100% 100%)';

    return (
        <PinProtection
            workspaceId={workspaceId}
            featureId="analytics"
            variant="analytics"
        >
            <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
                {/* Premium Background Effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

                <div className="p-8 max-w-[1600px] mx-auto min-h-screen animate-fade-in relative z-10">
                    
                    {/* Header Cockpit Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={16} className="text-emerald-500" />
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Insights Engine</span>
                            </div>
                            <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                                Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400">Cockpit</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Firm performance for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>

                        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
                            {['this-month', 'last-month', 'quarterly'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => handleFilterChange(f)}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                                        filter === f 
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {f.replace('-', ' ').toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Primary Alert Banner */}
                    {metrics?.courtDates?.upcoming > 0 && (
                        <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-between group cursor-help transition-all hover:shadow-lg hover:shadow-amber-500/5 backdrop-blur-md">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 flex items-center justify-center bg-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400">
                                    <Activity size={24} className="animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tracking-wider">OPERATIONAL ALERT</p>
                                    <p className="text-slate-700 dark:text-slate-300 text-base mt-0.5">
                                        <span className="font-extrabold text-amber-600 dark:text-amber-400">{metrics.courtDates.upcoming}</span> critical court dates detected in next 7 days.
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="text-amber-500/40 group-hover:translate-x-2 transition-transform duration-300" size={24} />
                        </div>
                    )}

                    {/* Main Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        
                        {/* Key Revenue Stat (Large Card) */}
                        <div className="md:col-span-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2.5rem] p-10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-500 group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        Total Collections
                                    </p>
                                    <h2 className="text-[4rem] leading-none font-black tracking-tighter text-slate-900 dark:text-white mb-6">
                                        {formatCurrency(metrics?.revenue?.total)}
                                    </h2>
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold inline-flex shadow-sm ${
                                        (metrics?.revenue?.growth || 0) >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                                    }`}>
                                        {(metrics?.revenue?.growth || 0) >= 0 ? <ArrowUp size={16} strokeWidth={3} /> : <TrendingDown size={16} strokeWidth={3} />}
                                        {Math.abs(metrics?.revenue?.growth || 0).toFixed(1)}% vs Last Month
                                    </div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[1.25rem] shadow-lg shadow-emerald-500/25 flex items-center justify-center text-white transform group-hover:rotate-12 transition-transform duration-500">
                                    <DollarSign size={32} />
                                </div>
                            </div>

                            {/* Mini Chart for Visual Context */}
                            <div className="mt-10 h-32 w-full relative">
                                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                                        </linearGradient>
                                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur stdDeviation="2" result="blur" />
                                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                        </filter>
                                    </defs>
                                    <path 
                                        d={`M 0,100 L ${getChartPoints()} L 100,100 Z`}
                                        fill="url(#chartGradient)"
                                    />
                                    <polyline
                                        fill="none"
                                        stroke="#10B981"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                        points={getChartPoints()}
                                        filter="url(#glow)"
                                        className="group-hover:stroke-[4px] transition-all duration-500"
                                    />
                                 </svg>
                            </div>
                        </div>

                        {/* Active Matters Card */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2.5rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col justify-between group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                            <div className="flex justify-between items-start relative z-10">
                                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                                    <Briefcase size={28} />
                                </div>
                                <p className="text-[3.5rem] font-black text-slate-900 dark:text-white tracking-tighter leading-none">{metrics?.matters?.active || 0}</p>
                            </div>
                            <div className="relative z-10 mt-8">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">Active Matters</p>
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Sparkles size={14} /> +{metrics?.matters?.newThisMonth || 0} Registered New
                                </p>
                            </div>
                        </div>

                        {/* Expenses Card */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2.5rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col justify-between group relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors pointer-events-none" />
                            <div className="flex justify-between items-start relative z-10">
                                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                                    <TrendingDown size={28} />
                                </div>
                            </div>
                            <div className="relative z-10 mt-8">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">Operational Burn</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{formatCurrency(metrics?.expenses?.total)}</p>
                                <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">{metrics?.expenses?.count || 0} Ledger Entries</p>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Analytics Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        
                        {/* Case Distribution (Donut style) */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2.5rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Case Distribution</h3>
                                <Target className="text-slate-400" size={24} />
                            </div>
                            
                            <div className="flex flex-col items-center justify-center flex-1">
                                <div className="relative w-56 h-56 rounded-full mb-10 shadow-[inset_0_4px_10px_rgba(0,0,0,0.1)] hover:scale-105 transition-transform duration-500" style={{ background: matterGradient }}>
                                    <div className="absolute inset-5 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                                        <span className="text-5xl font-black text-slate-900 dark:text-white leading-tight">{(totalMatters !== 1) ? totalMatters : 0}</span>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-1">Total Cases</span>
                                    </div>
                                </div>

                                <div className="w-full grid grid-cols-2 gap-3">
                                    {matterDistribution.map((d: any, i: number) => (
                                        <div key={d.status} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md hover:border-emerald-500/20 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-md" style={{ background: pieColors[i % pieColors.length] }} />
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-[0.1em]">{d.status}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{d.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Top Clients Table Component */}
                        <div className="lg:col-span-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-500">
                            <div className="p-8 pb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Top Revenue Drivers</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">High-value client relationship matrix</p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Users size={24} />
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto p-4">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/50">
                                            <th className="py-5 px-4">Global Client</th>
                                            <th className="py-5 px-4">Lifecycle Revenue</th>
                                            <th className="py-5 px-4">Exposure</th>
                                            <th className="py-5 px-4 text-right">Settlement status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50/50 dark:divide-slate-800/50">
                                        {topClients.map((client: any) => (
                                            <tr key={client.name} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border border-white dark:border-slate-600 shadow-sm rounded-[1rem] flex items-center justify-center text-slate-700 dark:text-slate-300 font-black text-sm group-hover:from-emerald-400 group-hover:to-teal-500 group-hover:text-white group-hover:shadow-md transition-all duration-300">
                                                            {client.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{client.name}</p>
                                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide">{client.activeMatters} Active Briefs</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-sm font-black text-slate-900 dark:text-white">
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">{formatCurrency(client.totalRevenue)}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-sm font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg">
                                                        {formatCurrency(client.outstanding)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.15em] uppercase border shadow-sm ${
                                                        client.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                                                        client.status.includes('PARTLY') ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                                    }`}>
                                                        {client.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {topClients.length === 0 && (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-500 font-medium">Clear of current lead activity</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Final Performance Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Lawyer Performance Card */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2.5rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-500">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Council Performance</h3>
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <Users size={20} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                {lawyerStats.map((lawyer: any, idx: number) => (
                                    <div key={lawyer.name} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50 transition-all group">
                                        <div className="flex items-center gap-5">
                                            <span className="text-sm font-black text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors w-6 text-right">0{idx + 1}</span>
                                            <div>
                                                <p className="text-base font-black text-slate-900 dark:text-white">{lawyer.name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] mt-0.5 flex items-center gap-1">
                                                    <Target size={10} /> {lawyer.topCourt || 'Federal High Court'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xl font-black text-slate-900 dark:text-white">{lawyer.appearances}</span>
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Appearances</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Court Frequency Card */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2.5rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden relative group hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] transition-all duration-500">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 relative z-10">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Jurisdictional Footprint</h3>
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div className="space-y-6 relative z-10 px-2">
                                {courtVisits.map((cv: any) => (
                                    <div key={cv.court} className="relative">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{cv.court}</span>
                                            <span className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{cv.count} VISITS</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 box-shadow-inner rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full group-hover:opacity-90 relative transition-all duration-1000 ease-out"
                                                style={{ width: `${Math.min((cv.count / (courtVisits[0]?.count || 1)) * 100, 100)}%` }}
                                            >
                                                <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {courtVisits.length === 0 && <p className="text-center py-12 font-medium text-slate-400">No jurisdictional data recorded</p>}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </PinProtection>
    );
}

