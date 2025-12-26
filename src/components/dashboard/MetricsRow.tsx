import { ArrowUpRight, Calendar, CheckSquare, FileText, TrendingUp, BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from "@/lib/utils";

interface MetricsRowProps {
    metrics: {
        pendingTasks: number;
        upcomingHearings: number;
        activeBriefs: number;
        monthlyRevenue?: number;
    };
    userRole?: string;
}

export function MetricsRow({ metrics, userRole }: MetricsRowProps) {
    const isPartner = userRole === 'owner' || userRole === 'partner';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount / 100);
    };

    const StatCard = ({
        title,
        value,
        icon: Icon,
        gradientClass,
        iconClass,
        subtext,
        isPrivate = false
    }: any) => (
        <div className={cn(
            "relative overflow-hidden rounded-xl bg-white p-6 border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group cursor-pointer",
            isPrivate && "opacity-75"
        )}>
            {/* Hover Gradient Overlay */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500",
                gradientClass
            )} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white",
                    iconClass
                )}>
                    <Icon className="w-6 h-6" />
                </div>
                {isPrivate && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        Private
                    </span>
                )}
            </div>

            <div className="relative z-10">
                <div className="text-3xl font-light text-slate-900 mb-1">{value}</div>
                <div className="text-sm font-medium text-slate-500">{title}</div>
                {subtext && <div className="text-xs font-light text-slate-400 mt-1">{subtext}</div>}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Pending Tasks"
                value={metrics.pendingTasks}
                icon={CheckSquare}
                gradientClass="bg-gradient-to-br from-amber-500 to-orange-600"
                iconClass="bg-gradient-to-br from-amber-500 to-orange-600"
                subtext="Requires Action"
            />

            <StatCard
                title="Court Dates"
                value={metrics.upcomingHearings}
                icon={Calendar}
                gradientClass="bg-gradient-to-br from-purple-500 to-pink-500"
                iconClass="bg-gradient-to-br from-purple-500 to-pink-500"
                subtext="Next 7 Days"
            />

            <StatCard
                title="Active Briefs"
                value={metrics.activeBriefs}
                icon={FileText}
                gradientClass="bg-gradient-to-br from-blue-500 to-cyan-500"
                iconClass="bg-gradient-to-br from-blue-500 to-cyan-500"
                subtext="In Progress"
            />

            {isPartner ? (
                <StatCard
                    title="Revenue (MTD)"
                    value={formatCurrency(metrics.monthlyRevenue || 0)}
                    icon={TrendingUp}
                    gradientClass="bg-gradient-to-br from-emerald-500 to-teal-500"
                    iconClass="bg-gradient-to-br from-emerald-500 to-teal-500"
                    subtext="Verified Income"
                />
            ) : (
                <StatCard
                    title="Firm Utilization"
                    value="--"
                    icon={BarChart2}
                    gradientClass="bg-gradient-to-br from-slate-500 to-slate-600"
                    iconClass="bg-gradient-to-br from-slate-500 to-slate-600"
                    subtext="Restricted Access"
                    isPrivate={true}
                />
            )}
        </div>
    );
}
