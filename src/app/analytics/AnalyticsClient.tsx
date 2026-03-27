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
import { useCountUp } from '@/hooks/useCountUp';

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
        if (!revenueTrend || revenueTrend.length < 2) return "0,100 100,100";
        return revenueTrend.map((d: any, i: number) => {
            const x = (i / (revenueTrend.length - 1)) * 100;
            const y = 90 - ((d.amount || 0) / maxRevenue) * 80;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return "0,90";
            return `${x},${y}`;
        }).join(' ');
    };

    const pieColors = ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0'];
    const totalMatters = (matterDistribution || []).reduce((acc: number, curr: any) => acc + (curr.count || 0), 0) || 1;
    
    const animatedRevenueTotal = useCountUp(metrics?.revenue?.total || 0, 2000);
    const animatedActiveMatters = useCountUp(metrics?.matters?.active || 0, 1500);
    const animatedExpensesTotal = useCountUp(metrics?.expenses?.total || 0, 1800);
    const animatedTotalCases = useCountUp(totalMatters, 1200);

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
            <div className="bg-slate-50 dark:bg-slate-900 min-w-0 flex-1">
                <div className="p-6 md:p-10 lg:p-12 max-w-[1600px] mx-auto text-slate-900 dark:text-slate-100">
                    
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles size={16} className="text-emerald-500" />
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Insights Engine</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-2 leading-tight">
                                Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400">Dashboard</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-2">Firm performance for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>

                        <div className="flex items-center gap-2 p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
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

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                            
                            {/* Key Revenue Stat (Large Card) */}
                            <div className="md:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 lg:p-10 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                
                                <div className="flex justify-between items-start relative z-10 gap-6">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">
                                            Total Collections
                                        </p>
                                        <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-8">
                                            {formatCurrency(animatedRevenueTotal)}
                                        </h2>
                                        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-bold inline-flex shadow-sm ${
                                            (metrics?.revenue?.growth || 0) >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                                        }`}>
                                            {(metrics?.revenue?.growth || 0) >= 0 ? <ArrowUp size={16} strokeWidth={3} /> : <TrendingDown size={16} strokeWidth={3} />}
                                            {Math.abs(metrics?.revenue?.growth || 0).toFixed(1)}% vs Last Month
                                        </div>
                                    </div>
                                    <div className="w-14 h-14 shrink-0 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <DollarSign size={28} strokeWidth={2.5} />
                                    </div>
                                </div>

                            {/* Standard Line Graph Visualization */}
                            <div className="mt-10 h-40 w-full relative">
                                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500 overflow-visible">
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    
                                    {/* Horizontal Grid Lines */}
                                    {[0, 25, 50, 75, 100].map((v) => (
                                        <line 
                                            key={v} 
                                            x1="0" y1={v} x2="100" y2={v} 
                                            stroke="currentColor" 
                                            className="text-slate-100 dark:text-slate-700/50" 
                                            strokeWidth="0.5" 
                                        />
                                    ))}

                                    <path 
                                        d={`M 0,100 L ${getChartPoints()} L 100,100 Z`}
                                        fill="url(#chartGradient)"
                                    />
                                    <polyline
                                        fill="none"
                                        stroke="#10B981"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                        points={getChartPoints()}
                                        className="animate-draw"
                                    />

                                    {/* Data Points */}
                                    {revenueTrend.map((d: any, i: number) => {
                                        const x = (i / (revenueTrend.length - 1)) * 100;
                                        const y = 90 - ((d.amount || 0) / maxRevenue) * 80;
                                        return (
                                            <circle 
                                                key={i}
                                                cx={x} cy={y} r="1.5"
                                                fill="#10B981"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                            />
                                        );
                                    })}
                                 </svg>
                                 <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                    <span>{revenueTrend[0]?.month || 'Start'}</span>
                                    <span>{revenueTrend[Math.floor(revenueTrend.length/2)]?.month}</span>
                                    <span>{revenueTrend[revenueTrend.length-1]?.month || 'End'}</span>
                                 </div>
                            </div>
                        </div>

                        {/* Active Matters */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                            <div className="flex justify-between items-start relative z-10 gap-4">
                                <div className="w-12 h-12 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                                    <Briefcase size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{animatedActiveMatters}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Active Matters</p>
                                </div>
                            </div>
                            <div className="mt-auto pt-8 border-t border-slate-50 dark:border-slate-700/50 relative z-10">
                                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <Sparkles size={14} /> +{metrics?.matters?.newThisMonth || 0} THIS PERIOD
                                </p>
                            </div>
                        </div>

                        {/* Operational Burn */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors pointer-events-none" />
                             <div className="flex justify-between items-start relative z-10 gap-4">
                                <div className="w-12 h-12 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-orange-500 transition-colors">
                                    <TrendingDown size={24} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operational Burn</p>
                                <p className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white truncate tracking-tight">{formatCurrency(animatedExpensesTotal)}</p>
                                <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mt-2">{metrics?.expenses?.count || 0} TRACKED ENTRIES</p>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        
                        {/* Case Distribution */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-10 tracking-tight">Case Distribution</h3>
                            <div className="flex flex-col items-center">
                                <div className="relative w-44 h-44 rounded-full mb-10" style={{ background: matterGradient }}>
                                    <div className="absolute inset-10 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center shadow-inner">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">{(totalMatters !== 1) ? animatedTotalCases : 0}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center leading-tight">Total<br/>Volume</span>
                                    </div>
                                </div>
                                <div className="w-full grid grid-cols-2 gap-4">
                                    {matterDistribution.map((d: any, i: number) => (
                                        <div key={d.status} className="flex flex-col gap-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-emerald-500/20 transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d.status}</span>
                                            </div>
                                            <span className="text-lg font-black text-slate-800 dark:text-white pl-4">{d.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Top Revenue Drivers Table */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
                            <div className="p-10 pb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Top Revenue Drivers</h3>
                                    <p className="text-slate-400 text-sm font-medium mt-1">High-value client relationship matrix</p>
                                </div>
                                <Users size={24} className="text-slate-300" />
                            </div>
                            
                            <div className="overflow-x-auto">
                                <div className="min-w-[700px] p-6 lg:p-10 pt-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                <th className="pb-6 pr-6">Client Identity</th>
                                                <th className="pb-6 px-6">Lifecycle Rev</th>
                                                <th className="pb-6 pl-6 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {topClients.map((client: any) => (
                                                <tr key={client.name} className="group transition-colors">
                                                    <td className="py-5 pr-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-sm group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-emerald-500 transition-all">
                                                                {client.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">{client.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{client.activeMatters} Briefs</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <span className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(client.totalRevenue)}</span>
                                                    </td>
                                                    <td className="py-5 pl-6 text-right">
                                                        <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase border shadow-sm ${
                                                            client.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                                                            client.status.includes('PARTLY') ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                                        }`}>
                                                            {client.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final Row: Performance */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-8 tracking-tight">Council Performance</h3>
                            <div className="space-y-6">
                                {lawyerStats.map((lawyer: any, idx: number) => (
                                    <div key={lawyer.name} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-6">
                                            <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-500 transition-colors w-4">0{idx + 1}</span>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">{lawyer.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{lawyer.topCourt || 'Federal High Court'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-slate-800 dark:text-white">{lawyer.appearances}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sittings</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-8 tracking-tight">Jurisdictional Activity</h3>
                            <div className="space-y-8">
                                {courtVisits.map((cv: any) => (
                                    <div key={cv.court}>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{cv.court}</span>
                                            <span className="text-[10px] font-black text-slate-400">{cv.count} VISITS</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${Math.min((cv.count / (courtVisits[0]?.count || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PinProtection>
    );
}
