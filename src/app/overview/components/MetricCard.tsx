import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon | string; // Allow string for emoji if needed, though snippet used icons
    onClick?: () => void;
    className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, onClick, className }: MetricCardProps) {
    const isLucide = typeof Icon !== 'string';

    return (
        <div
            onClick={onClick}
            className={cn(
                "metric-card bg-surface rounded-xl p-7 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[2px] transition-all duration-300 cursor-pointer relative",
                className
            )}
        >
            <div className="flex justify-between items-start mb-5">
                <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.5px] text-secondary mb-2">
                        {title}
                    </div>
                    <div className="text-5xl font-bold text-primary leading-none mb-2">
                        {value}
                    </div>
                    {subtitle && (
                        <div className="text-[13px] font-medium text-teal-text">
                            {subtitle}
                        </div>
                    )}
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-teal-bg text-teal-text">
                    {isLucide ? <Icon size={24} /> : <span className="text-2xl">{Icon}</span>}
                </div>
            </div>
        </div>
    );
}
