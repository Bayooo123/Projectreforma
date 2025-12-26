import { ArrowUpRight, Calendar, CheckSquare, FileText, TrendingUp, BarChart2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
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

    const MetricCard = ({
        title,
        value,
        icon: Icon,
        colorClass,
        bgClass,
        footerText,
        footerClass,
        isPrivate = false
    }: any) => (
        <Card className={cn("overflow-hidden transition-all duration-200 hover:shadow-md border-t-4", colorClass)}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-2.5 rounded-lg", bgClass)}>
                        <Icon className={cn("w-5 h-5", footerClass)} />
                    </div>
                    {isPrivate && (
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Private
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900">{value}</h3>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center">
                    <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full bg-opacity-10 w-fit", bgClass, footerClass)}>
                        {footerText}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
                title="My Pending Tasks"
                value={metrics.pendingTasks}
                icon={CheckSquare}
                colorClass="border-t-blue-500"
                bgClass="bg-blue-50"
                footerClass="text-blue-600"
                footerText="Requires Action"
            />

            <MetricCard
                title="Court Dates (7 Days)"
                value={metrics.upcomingHearings}
                icon={Calendar}
                colorClass="border-t-purple-500"
                bgClass="bg-purple-50"
                footerClass="text-purple-600"
                footerText="Upcoming"
            />

            <MetricCard
                title="Active Briefs"
                value={metrics.activeBriefs}
                icon={FileText}
                colorClass="border-t-amber-500"
                bgClass="bg-amber-50"
                footerClass="text-amber-600"
                footerText="In Progress"
            />

            {isPartner ? (
                <MetricCard
                    title="Revenue (MTD)"
                    value={formatCurrency(metrics.monthlyRevenue || 0)}
                    icon={TrendingUp}
                    colorClass="border-t-emerald-500"
                    bgClass="bg-emerald-50"
                    footerClass="text-emerald-600"
                    footerText="+12% vs last month"
                />
            ) : (
                <MetricCard
                    title="Firm Utilization"
                    value="--"
                    icon={BarChart2}
                    colorClass="border-t-slate-300"
                    bgClass="bg-slate-100"
                    footerClass="text-slate-500"
                    footerText="Restricted Access"
                    isPrivate={true}
                />
            )}
        </div>
    );
}
