'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ExpensePeriodFilter.module.css';

export interface DateRange {
    startDate: string;
    endDate: string;
    label: string;
}

type PeriodMode = 'month' | 'q1' | 'q2' | 'q3' | 'q4' | 'year';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function buildRange(mode: PeriodMode, year: number, month: number): DateRange {
    switch (mode) {
        case 'month': {
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString(), label: `${FULL_MONTHS[month]} ${year}` };
        }
        case 'q1': {
            const start = new Date(year, 0, 1);
            const end = new Date(year, 3, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString(), label: `Q1 ${year} (Jan–Mar)` };
        }
        case 'q2': {
            const start = new Date(year, 3, 1);
            const end = new Date(year, 6, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString(), label: `Q2 ${year} (Apr–Jun)` };
        }
        case 'q3': {
            const start = new Date(year, 6, 1);
            const end = new Date(year, 9, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString(), label: `Q3 ${year} (Jul–Sep)` };
        }
        case 'q4': {
            const start = new Date(year, 9, 1);
            const end = new Date(year, 12, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString(), label: `Q4 ${year} (Oct–Dec)` };
        }
        case 'year': {
            const start = new Date(year, 0, 1);
            const end = new Date(year, 12, 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString(), label: `Full Year ${year}` };
        }
    }
}

interface ExpensePeriodFilterProps {
    onChange: (range: DateRange) => void;
}

export default function ExpensePeriodFilter({ onChange }: ExpensePeriodFilterProps) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [mode, setMode] = useState<PeriodMode>('month');
    const [month, setMonth] = useState(now.getMonth());

    // Fire onChange whenever any selection changes
    useEffect(() => {
        onChange(buildRange(mode, year, month));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, year, month]);

    const handleMode = (m: PeriodMode) => {
        setMode(m);
    };

    const PERIOD_BUTTONS: { id: PeriodMode; label: string }[] = [
        { id: 'month', label: 'Monthly' },
        { id: 'q1', label: 'Q1' },
        { id: 'q2', label: 'Q2' },
        { id: 'q3', label: 'Q3' },
        { id: 'q4', label: 'Q4' },
        { id: 'year', label: 'Full Year' },
    ];

    return (
        <div className={styles.wrapper}>
            {/* Year navigator */}
            <div className={styles.yearRow}>
                <button
                    className={styles.yearNav}
                    onClick={() => setYear(y => y - 1)}
                    title="Previous year"
                >
                    <ChevronLeft size={15} />
                </button>
                <span className={styles.yearLabel}>{year}</span>
                <button
                    className={styles.yearNav}
                    onClick={() => setYear(y => y + 1)}
                    disabled={year >= now.getFullYear() + 1}
                    title="Next year"
                >
                    <ChevronRight size={15} />
                </button>
            </div>

            {/* Period mode buttons */}
            <div className={styles.periodRow}>
                {PERIOD_BUTTONS.map(btn => (
                    <button
                        key={btn.id}
                        className={`${styles.periodBtn} ${mode === btn.id ? styles.periodBtnActive : ''}`}
                        onClick={() => handleMode(btn.id)}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {/* Month picker — only visible when mode === 'month' */}
            {mode === 'month' && (
                <div className={styles.monthGrid}>
                    {MONTHS.map((m, i) => (
                        <button
                            key={m}
                            className={`${styles.monthBtn} ${month === i ? styles.monthBtnActive : ''}`}
                            onClick={() => setMonth(i)}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
