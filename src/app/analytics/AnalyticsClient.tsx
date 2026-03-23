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
    Search
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
            const x = (i / (revenueTrend.length - 1)) * 100; // Using 100 as base viewBox width
            const y = 100 - ((d.amount || 0) / maxRevenue) * 80;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return "0,0";
            return `${x},${y}`;
        }).join(' ');
    };

    // Pie chart colors
    const pieColors = ['var(--primary)', '#10B981', '#F59E0B', 'var(--text-tertiary)', '#EF4444'];
    const totalMatters = (matterDistribution || []).reduce((acc: number, curr: any) => acc + (curr.count || 0), 0) || 1;
    
    const matterGradient = matterDistribution.length > 0
        ? `conic-gradient(${matterDistribution.map((d: any, i: number) => {
            const start = matterDistribution.slice(0, i).reduce((sum: number, prev: any) => sum + (prev.count || 0), 0) / totalMatters * 100;
            const end = start + ((d.count || 0) / totalMatters * 100);
            return `${pieColors[i % pieColors.length]} ${start}% ${end}%`;
        }).join(', ')})`
        : 'conic-gradient(var(--border) 100% 100%)';

    return (
        <PinProtection
            workspaceId={workspaceId}
            featureId="analytics"
            variant="analytics"
        >
            <div className="p-8 max-w-[1600px] mx-auto min-h-screen animate-fade-in">
                
                {/* Header Cockpit Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-1 bg-primary rounded-full" />
                            <span className="text-xs font-bold uppercase tracking-widest text-primary opacity-80">Insights Engine</span>
                        </div>
                        <h1 className="text-4xl font-bold text-primary tracking-tight">Executive Cockpit</h1>
                        <p className="text-secondary mt-1 font-medium">Firm performance for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div className="flex items-center gap-3 bg-surface border border-border p-1.5 rounded-2xl shadow-sm">
                        {['this-month', 'last-month', 'quarterly'].map((f) => (
                            <button
                                key={f}
                                onClick={() => handleFilterChange(f)}
                                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                                    filter === f 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                                    : 'text-secondary hover:bg-surface-subtle'
                                }`}
                            >
                                {f.replace('-', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Alert Banner */}
                {metrics?.courtDates?.upcoming > 0 && (
                    <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between group cursor-help transition-all hover:bg-primary/[0.08]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-primary/20 rounded-xl text-primary animate-pulse">
                                <Activity size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-primary">OPERATIONAL ALERT</p>
                                <p className="text-secondary text-sm">
                                    <span className="font-bold text-primary">{metrics.courtDates.upcoming}</span> critical court dates detected in next 7 days.
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="text-primary/40 group-hover:translate-x-1 transition-transform" />
                    </div>
                )}

                {/* Main Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    
                    {/* Key Revenue Stat (Large Card) */}
                    <div className="md:col-span-2 bg-surface border border-border rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Total Collections</p>
                                <h2 className="text-5xl font-black text-primary tracking-tighter mb-4">
                                    {formatCurrency(metrics?.revenue?.total)}
                                </h2>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold inline-flex ${
                                    (metrics?.revenue?.growth || 0) >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                }`}>
                                    {(metrics?.revenue?.growth || 0) >= 0 ? <ArrowUp size={12} /> : <TrendingDown size={12} />}
                                    {Math.abs(metrics?.revenue?.growth || 0).toFixed(1)}% vs Last Month
                                </div>
                            </div>
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <DollarSign size={28} />
                            </div>
                        </div>

                        {/* Mini Chart for Visual Context */}
                        <div className="mt-8 h-24 w-full relative group-hover:scale-[1.02] transition-transform duration-500">
                             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-30">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path 
                                    d={`M 0,100 L ${getChartPoints()} L 100,100 Z`}
                                    fill="url(#chartGradient)"
                                />
                                <polyline
                                    fill="none"
                                    stroke="var(--primary)"
                                    strokeWidth="3"
                                    vectorEffect="non-scaling-stroke"
                                    points={getChartPoints()}
                                />
                             </svg>
                        </div>
                    </div>

                    {/* Active Matters Card */}
                    <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success group-hover:scale-110 transition-transform">
                                <Briefcase size={24} />
                            </div>
                            <p className="text-[2.5rem] font-black text-primary tracking-tighter leading-none">{metrics?.matters?.active || 0}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Active Matters</p>
                            <p className="text-sm font-bold text-success">+{metrics?.matters?.newThisMonth || 0} Registered New</p>
                        </div>
                    </div>

                    {/* Expenses Card */}
                    <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-danger/10 rounded-2xl flex items-center justify-center text-danger group-hover:scale-110 transition-transform">
                                <TrendingDown size={24} />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Operational Burn</p>
                            <p className="text-2xl font-black text-primary tracking-tight mb-1">{formatCurrency(metrics?.expenses?.total)}</p>
                            <p className="text-xs font-bold text-danger opacity-80">{metrics?.expenses?.count || 0} Ledger Entries</p>
                        </div>
                    </div>
                </div>

                {/* Secondary Analytics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Case Distribution (Donut style) */}
                    <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-primary tracking-tight">Case Distribution</h3>
                            <Target className="text-secondary opacity-20" size={20} />
                        </div>
                        
                        <div className="flex flex-col items-center justify-center flex-1">
                            <div className="relative w-48 h-48 rounded-full mb-8 shadow-inner" style={{ background: matterGradient }}>
                                <div className="absolute inset-4 bg-surface rounded-full flex flex-col items-center justify-center shadow-sm">
                                    <span className="text-3xl font-black text-primary leading-tight">{(totalMatters !== 1) ? totalMatters : 0}</span>
                                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Total Cases</span>
                                </div>
                            </div>

                            <div className="w-full space-y-3">
                                {matterDistribution.map((d: any, i: number) => (
                                    <div key={d.status} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-subtle transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                                            <span className="text-xs font-bold text-secondary group-hover:text-primary transition-colors uppercase tracking-wide">{d.status}</span>
                                        </div>
                                        <span className="text-sm font-black text-primary">{d.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Clients Table Component */}
                    <div className="lg:col-span-2 bg-surface border border-border rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-primary tracking-tight">Top Revenue Drivers</h3>
                                <p className="text-secondary text-xs font-bold mt-1">High-value client relationship matrix</p>
                            </div>
                            <Users className="text-secondary opacity-20" size={20} />
                        </div>
                        
                        <div className="overflow-x-auto px-6">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary border-b border-border">
                                        <th className="py-4 px-2">Global Client</th>
                                        <th className="py-4 px-2">Lifecycle Revenue</th>
                                        <th className="py-4 px-2">Exposure</th>
                                        <th className="py-4 px-2 text-right">Settlement status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topClients.map((client: any) => (
                                        <tr key={client.name} className="group hover:bg-surface-subtle transition-colors">
                                            <td className="py-5 px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary font-bold text-xs group-hover:bg-primary group-hover:text-white transition-all">
                                                        {client.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-primary group-hover:translate-x-0.5 transition-transform">{client.name}</p>
                                                        <p className="text-[10px] font-bold text-secondary">{client.activeMatters} Active Briefs</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-2 text-sm font-black text-primary">
                                                {formatCurrency(client.totalRevenue)}
                                            </td>
                                            <td className="py-5 px-2 text-sm font-bold text-danger/80">
                                                {formatCurrency(client.outstanding)}
                                            </td>
                                            <td className="py-5 px-2 text-right">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                                                    client.status === 'PAID' ? 'bg-success/10 text-success' : 
                                                    client.status.includes('PARTLY') ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                                                }`}>
                                                    {client.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {topClients.length === 0 && (
                                        <tr><td colSpan={4} className="py-20 text-center text-secondary font-bold italic">Clear of current lead activity</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Final Performance Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    
                    {/* Lawyer Performance Card */}
                    <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-primary tracking-tight">Council Performance</h3>
                            <Users className="text-secondary opacity-20" size={20} />
                        </div>
                        <div className="space-y-6">
                            {lawyerStats.map((lawyer: any, idx: number) => (
                                <div key={lawyer.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-black text-secondary/30">0{idx + 1}</span>
                                        <div>
                                            <p className="text-sm font-bold text-primary">{lawyer.name}</p>
                                            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">{lawyer.topCourt || 'Federal High Court'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm font-black text-primary">{lawyer.appearances}</span>
                                        <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Appearances</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Court Frequency Card */}
                    <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-sm overflow-hidden relative group">
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h3 className="text-lg font-bold text-primary tracking-tight">Jurisdictional Footprint</h3>
                            <ChevronRight className="text-secondary opacity-30" size={20} />
                        </div>
                        <div className="space-y-6 relative z-10">
                            {courtVisits.map((cv: any) => (
                                <div key={cv.court}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-primary">{cv.court}</span>
                                        <span className="text-[10px] font-black text-secondary">{cv.count} VISITS</span>
                                    </div>
                                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary rounded-full group-hover:opacity-80 transition-all duration-1000"
                                            style={{ width: `${Math.min((cv.count / (courtVisits[0]?.count || 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {courtVisits.length === 0 && <p className="text-center py-10 font-bold text-secondary italic">No jurisdictional data recorded</p>}
                        </div>
                    </div>

                </div>

            </div>
        </PinProtection>
    );
}
