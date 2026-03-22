'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

export type FilterType = 'Month' | 'Quarter' | 'Half-Year' | 'Year';

export interface DateRange {
    startDate: string;
    endDate: string;
    label: string;
}

interface ExpensePeriodFilterProps {
    onChange: (range: DateRange) => void;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ExpensePeriodFilter({ onChange }: ExpensePeriodFilterProps) {
    const [filterType, setFilterType] = useState<FilterType>('Month');
    const [selectedValue, setSelectedValue] = useState<string>('');

    // Generate options based on type
    const options = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i); // e.g., 2027 down to 2023
        const opts: { label: string; value: string; start: string; end: string }[] = [];

        if (filterType === 'Month') {
            years.forEach(year => {
                MONTHS.forEach((month, idx) => {
                    const start = new Date(year, idx, 1);
                    const end = new Date(year, idx + 1, 0, 23, 59, 59, 999);
                    opts.push({
                        label: `${month} ${year}`,
                        value: `${year}-${idx + 1}`,
                        start: start.toISOString(),
                        end: end.toISOString()
                    });
                });
            });
        } else if (filterType === 'Quarter') {
            years.forEach(year => {
                for (let q = 1; q <= 4; q++) {
                    const startMonth = (q - 1) * 3;
                    const start = new Date(year, startMonth, 1);
                    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
                    opts.push({
                        label: `Q${q} ${year}`,
                        value: `${year}-Q${q}`,
                        start: start.toISOString(),
                        end: end.toISOString()
                    });
                }
            });
        } else if (filterType === 'Half-Year') {
            years.forEach(year => {
                for (let h = 1; h <= 2; h++) {
                    const startMonth = (h - 1) * 6;
                    const start = new Date(year, startMonth, 1);
                    const end = new Date(year, startMonth + 6, 0, 23, 59, 59, 999);
                    opts.push({
                        label: `H${h} ${year}`,
                        value: `${year}-H${h}`,
                        start: start.toISOString(),
                        end: end.toISOString()
                    });
                }
            });
        } else if (filterType === 'Year') {
            years.forEach(year => {
                const start = new Date(year, 0, 1);
                const end = new Date(year, 12, 0, 23, 59, 59, 999);
                opts.push({
                    label: `${year}`,
                    value: `${year}`,
                    start: start.toISOString(),
                    end: end.toISOString()
                });
            });
        }
        
        // Return sorted (most recent first conceptually, but for months we want descending chronologically)
        return opts.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    }, [filterType]);

    // Set default value when type changes
    useEffect(() => {
        if (options.length > 0) {
            const now = new Date();
            let defaultOpt = options[0];
            
            // Try to find current period
            if (filterType === 'Month') {
                const currentVal = `${now.getFullYear()}-${now.getMonth() + 1}`;
                defaultOpt = options.find(o => o.value === currentVal) || options[0];
            } else if (filterType === 'Quarter') {
                const q = Math.floor(now.getMonth() / 3) + 1;
                const currentVal = `${now.getFullYear()}-Q${q}`;
                defaultOpt = options.find(o => o.value === currentVal) || options[0];
            } else if (filterType === 'Half-Year') {
                const h = Math.floor(now.getMonth() / 6) + 1;
                const currentVal = `${now.getFullYear()}-H${h}`;
                defaultOpt = options.find(o => o.value === currentVal) || options[0];
            } else if (filterType === 'Year') {
                const currentVal = `${now.getFullYear()}`;
                defaultOpt = options.find(o => o.value === currentVal) || options[0];
            }

            setSelectedValue(defaultOpt.value);
            // Don't fire onChange here immediately to avoid double fetching on mount, 
            // the parent will coordinate initial fetch, or we can fire it. 
            // It's safer to fire it so parent stays in sync.
            onChange({
                startDate: defaultOpt.start,
                endDate: defaultOpt.end,
                label: defaultOpt.label
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType, options]);

    const handleValueChange = (val: string) => {
        setSelectedValue(val);
        const opt = options.find(o => o.value === val);
        if (opt) {
            onChange({
                startDate: opt.start,
                endDate: opt.end,
                label: opt.label
            });
        }
    };

    return (
        <div className="flex items-center gap-3 p-1 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 pl-3 border-r border-slate-200 pr-2">
                <Calendar size={16} className="text-slate-400" />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer appearance-none pr-4"
                >
                    <option value="Month">Month</option>
                    <option value="Quarter">Quarter</option>
                    <option value="Half-Year">Half-Year</option>
                    <option value="Year">Year</option>
                </select>
            </div>
            
            <div className="relative flex items-center pr-2">
                <select
                    value={selectedValue}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="bg-transparent text-sm font-medium text-slate-900 outline-none cursor-pointer appearance-none pl-2 pr-8 w-40"
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown size={14} className="text-slate-500 absolute right-2 pointer-events-none" />
            </div>
        </div>
    );
}
