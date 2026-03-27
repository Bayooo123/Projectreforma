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
            <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
                <style>{`
                    @keyframes drawLine {
                        from { stroke-dashoffset: 600; }
                        to { stroke-dashoffset: 0; }
                    }
                    .animate-draw {
                        stroke-dasharray: 600;
                        animation: drawLine 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    }
                    @keyframes staggerSlideUp {
                        from { opacity: 0; transform: translateY(20px) scale(0.98); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .stagger-1 { animation: staggerSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both; }
                    .stagger-2 { animation: staggerSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s both; }
                    .stagger-3 { animation: staggerSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both; }
                    .stagger-4 { animation: staggerSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s both; }
                    .stagger-5 { animation: staggerSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s both; }
                    
                    .glass-panel {
                        box-shadow: 0 8px 32px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 1px rgba(255,255,255,0.3);
                        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .dark .glass-panel {
                        box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -1px 1px rgba(255,255,255,0.02);
                    }
                    .glass-panel:hover {
                        box-shadow: 0 16px 48px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,1), inset 0 -1px 1px rgba(255,255,255,0.4);
                    }
                    .dark .glass-panel:hover {
                        box-shadow: 0 16px 48px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(255,255,255,0.05);
                    }
                `}</style>
                {/* Premium Background Effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

                <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen animate-fade-in relative z-10 text-slate-900 dark:text-slate-100">
                    
                    {/* Header Cockpit Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={16} className="text-emerald-500" />
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Insights Engine</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                                Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400">Dashboard</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Firm performance for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            
                            {/* Key Revenue Stat (Large Card) */}
                            <div className="md:col-span-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2.5rem] p-6 lg:p-8 xl:p-10 group overflow-hidden relative min-w-0 glass-panel stagger-1">
                                <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                
                                <div className="flex justify-between items-start relative z-10 gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 truncate">
                                            Total Collections
                                        </p>
                                        <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">
                                            {formatCurrency(animatedRevenueTotal)}
                                        </h2>
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold inline-flex shadow-sm whitespace-nowrap ${
                                            (metrics?.revenue?.growth || 0) >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                                        }`}>
                                            {(metrics?.revenue?.growth || 0) >= 0 ? <ArrowUp size={16} strokeWidth={3} className="shrink-0" /> : <TrendingDown size={16} strokeWidth={3} className="shrink-0" />}
                                            {Math.abs(metrics?.revenue?.growth || 0).toFixed(1)}% vs Last Month
                                        </div>
                                    </div>
                                    <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[1.25rem] shadow-lg shadow-emerald-500/25 flex items-center justify-center text-white transform group-hover:rotate-12 transition-transform duration-500">
                                        <DollarSign size={32} />
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

                        {/* Active Matters Card */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2rem] p-8 flex flex-col justify-between group relative overflow-hidden min-w-0 glass-panel stagger-2">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                            <div className="flex justify-between items-start relative z-10 gap-4">
                                <div className="w-12 h-12 shrink-0 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                                    <Briefcase size={24} />
                                </div>
                                <p className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{animatedActiveMatters}</p>
                            </div>
                            <div className="relative z-10 mt-6 md:mt-10 min-w-0">
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2 truncate">Active Matters</p>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
                                    <Sparkles size={12} className="shrink-0" /> <span className="truncate">+{metrics?.matters?.newThisMonth || 0} New Matters</span>
                                </p>
                            </div>
                        </div>

                        {/* Expenses Card */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2rem] p-8 flex flex-col justify-between group relative overflow-hidden min-w-0 glass-panel stagger-3">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors pointer-events-none" />
                            <div className="flex justify-between items-start relative z-10 gap-4">
                                <div className="w-12 h-12 shrink-0 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
                                    <TrendingDown size={24} />
                                </div>
                            </div>
                            <div className="relative z-10 mt-6 md:mt-10 min-w-0">
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2 truncate">Operational Burn</p>
                                <p className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 truncate">{formatCurrency(animatedExpensesTotal)}</p>
                                <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider truncate">{metrics?.expenses?.count || 0} Ledger Entries</p>
                            </div>
                        </div>
                    </div>

                        {/* Secondary Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        
                        {/* Case Distribution */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2rem] p-8 lg:p-10 flex flex-col glass-panel stagger-4">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Case Distribution</h3>
                                <Target className="text-slate-400" size={24} />
                            </div>
                            
                            <div className="flex flex-col items-center justify-center flex-1">
                                <div className="relative w-48 h-48 rounded-full mb-8 shadow-inner hover:scale-105 transition-transform duration-500" style={{ background: matterGradient }}>
                                    <div className="absolute inset-8 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{(totalMatters !== 1) ? animatedTotalCases : 0}</span>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-1 text-center">Total<br/>Cases</span>
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

                        {/* Top Clients Table */}
                        <div className="lg:col-span-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2rem] overflow-hidden flex flex-col glass-panel stagger-4">
                            <div className="p-6 lg:p-8 pb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 gap-4">
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
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 border-b border-slate-100/50 dark:border-slate-800/30">
                                            <th className="py-4 px-6">Global Client</th>
                                            <th className="py-4 px-6">Lifecycle Revenue</th>
                                            <th className="py-4 px-6 text-right">Settlement status</th>
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
                                                <td className="py-4 px-6 text-sm font-black text-slate-900 dark:text-white">
                                                    <span className="bg-slate-100/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg">{formatCurrency(client.totalRevenue)}</span>
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

                    {/* Performance Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        
                        {/* Council Performance */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2rem] p-8 lg:p-10 glass-panel stagger-5">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 gap-4 text-clip">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">Council Performance</h3>
                                <div className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <Users size={20} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                {lawyerStats.map((lawyer: any, idx: number) => (
                                    <div key={lawyer.name} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50 transition-all group min-w-0">
                                        <div className="flex items-center gap-4 lg:gap-5 min-w-0">
                                            <span className="text-sm font-black text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors w-6 text-right shrink-0">0{idx + 1}</span>
                                            <div className="min-w-0">
                                                <p className="text-base font-black text-slate-900 dark:text-white truncate">{lawyer.name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] mt-0.5 flex items-center gap-1 truncate">
                                                    <Target size={10} className="shrink-0" /> <span className="truncate">{lawyer.topCourt || 'Federal High Court'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 pl-2">
                                            <span className="text-xl font-black text-slate-900 dark:text-white">{lawyer.appearances}</span>
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Appearances</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Jurisdictional Footprint */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2rem] p-8 lg:p-10 glass-panel stagger-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 relative z-10 gap-4 text-clip">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">Jurisdictional Footprint</h3>
                                <div className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div className="space-y-6 relative z-10 px-2 min-w-0">
                                {courtVisits.map((cv: any) => (
                                    <div key={cv.court} className="relative min-w-0">
                                        <div className="flex justify-between items-center mb-3 min-w-0 gap-2 text-clip w-full">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{cv.court}</span>
                                            <span className="text-[11px] shrink-0 font-black tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{cv.count} VISITS</span>
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

