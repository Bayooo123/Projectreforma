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
        isPrivate = false,
        noIcon = false
    }: any) => (
        <div className={cn(
            "relative overflow-hidden rounded-2xl bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group cursor-pointer border-0 shadow-sm ring-1 ring-slate-100",
            isPrivate && "opacity-75"
        )}>
            {/* Subtle Gradient Background on Hover */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                gradientClass
            )} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                {!noIcon && (
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-teal-900/5 text-white transform group-hover:scale-110 transition-transform duration-300",
                        iconClass
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                {isPrivate && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                        Private
                    </span>
                )}
            </div>

            <div className={cn("relative z-10", noIcon && "mt-2")}>
                <div className="text-3xl font-light tracking-tight text-slate-900 mb-1">{value}</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wide text-[11px]">{title}</div>
                {subtext && <div className="text-xs font-medium text-emerald-600 mt-2 flex items-center bg-emerald-50 w-fit px-2 py-0.5 rounded-full">{subtext}</div>}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Pending Tasks"
                value={metrics.pendingTasks}
                icon={CheckSquare}
                gradientClass="bg-teal-600"
                iconClass="bg-gradient-to-br from-teal-500 to-teal-700"
                subtext="Requires Action"
            />

            <StatCard
                title="Court Dates"
                value={metrics.upcomingHearings}
                icon={Calendar}
                gradientClass="bg-emerald-600"
                iconClass="bg-gradient-to-br from-emerald-500 to-emerald-700"
                subtext="Next 7 Days"
            />

            <StatCard
                title="Active Briefs"
                value={metrics.activeBriefs}
                icon={FileText}
                gradientClass="bg-teal-800"
                iconClass="bg-gradient-to-br from-teal-600 to-emerald-800"
                subtext="In Progress"
            />

            {isPartner ? (
                <StatCard
                    title="Verified Revenue"
                    value={formatCurrency(metrics.monthlyRevenue || 0)}
                    icon={TrendingUp}
                    gradientClass="bg-emerald-500"
                    iconClass="hidden"
                    noIcon={true}
                    subtext="+12% growth"
                />
            ) : (
                <StatCard
                    title="Firm Utilization"
                    value="--"
                    icon={BarChart2}
                    gradientClass="bg-slate-500"
                    iconClass="bg-gradient-to-br from-slate-400 to-slate-600"
                    subtext="Restricted"
                    isPrivate={true}
                />
            )}
        </div>
    );
}
