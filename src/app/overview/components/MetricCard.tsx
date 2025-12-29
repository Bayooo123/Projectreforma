import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    onClick?: () => void;
    className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, onClick, className }: MetricCardProps) {
    return (
        <Card
            onClick={onClick}
            className={cn(
                "relative overflow-hidden border-none p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer group bg-white dark:bg-slate-800",
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground dark:text-slate-400">
                        {title}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {value}
                        </span>
                    </div>
                    {subtitle && (
                        <p className="mt-1 text-sm font-medium text-teal-600 dark:text-teal-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className="rounded-xl bg-teal-50 p-3 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 transition-colors group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50">
                    <Icon size={24} strokeWidth={2} />
                </div>
            </div>
        </Card>
    );
}
