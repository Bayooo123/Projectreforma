import { ArrowUpRight, Calendar, CheckSquare, FileText, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface MetricsRowProps {
    metrics: {
        pendingTasks: number;
        upcomingHearings: number;
        activeBriefs: number;
        monthlyRevenue?: number; // Optional, only for partners
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
        }).format(amount / 100); // Amount is in kobo
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">My Tasks</p>
                        <h3 className="text-2xl font-bold mt-1">{metrics.pendingTasks}</h3>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                    <span className="text-blue-600 font-medium flex items-center">
                        Pending Action
                    </span>
                </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Court Dates</p>
                        <h3 className="text-2xl font-bold mt-1">{metrics.upcomingHearings}</h3>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                    <span className="text-purple-600 font-medium">
                        Next 7 Days
                    </span>
                </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Briefs</p>
                        <h3 className="text-2xl font-bold mt-1">{metrics.activeBriefs}</h3>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-lg">
                        <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                    <span className="text-amber-600 font-medium">
                        In Progress
                    </span>
                </div>
            </Card>

            {/* Financials - Only visible to Partners/Owners */}
            {isPartner ? (
                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Revenue (MTD)</p>
                            <h3 className="text-xl font-bold mt-1">{formatCurrency(metrics.monthlyRevenue || 0)}</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                        <span className="text-emerald-600 font-medium flex items-center">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> Verified
                        </span>
                    </div>
                </Card>
            ) : (
                <Card className="p-4 border-l-4 border-l-slate-200 shadow-sm opacity-60">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Firm Utilization</p>
                            <h3 className="text-2xl font-bold mt-1">--</h3>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <BarChart2 className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                        Restricted Access
                    </div>
                </Card>
            )}
        </div>
    );
}

import { BarChart2 } from 'lucide-react';
