"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Gavel } from 'lucide-react';
import styles from './CalendarGrid.module.css';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'];

// Mock legal cases for calendar display
const EVENTS = [
    { date: 3, cases: ['State v. Johnson'] },
    { date: 5, cases: ['Adeyemi v. FBN', 'Estate of Okoro', 'MTN v. NCC', 'Dangote v. COP'] },
    { date: 8, cases: ['TechCorp v. FirstBank', 'Simisola v. COP', 'Okonkwo v. State', 'Adeleke Ltd v. FIRS'] },
    { date: 9, cases: ['Maritime v. NIMASA', 'Phoenix Grp v. SEC'] },
    { date: 10, cases: ['Green Meadow v. Lagos', 'OmniTech v. NITDA'] },
    { date: 11, cases: ['Stellar Corp v. EFCC'] },
    { date: 13, cases: ['Yusuf v. Immigration', 'Chukwu v. Customs'] },
    { date: 15, cases: ['Estate of Bello', 'Ajayi v. Police'] },
    { date: 16, cases: ['Nnamdi v. State', 'Obi v. INEC'] },
    { date: 17, cases: ['Kano Traders v. CBN'] },
    { date: 18, cases: ['Ibrahim v. NDLEA'] },
    { date: 19, cases: ['Adeola v. FRSC', 'Musa v. Army'] },
    { date: 20, cases: ['Chioma v. Navy'] },
    { date: 22, cases: ['Tunde v. NNPC', 'Grace v. NEPA'] },
    { date: 23, cases: ['Zainab v. Customs'] },
    { date: 24, cases: ['Emeka v. Immigration'] },
    { date: 25, cases: ['Folake v. Police', 'Bola v. EFCC'] },
    { date: 26, cases: ['Kunle v. State'] },
    { date: 27, cases: ['Ngozi v. FIRS', 'Segun v. CBN'] },
];

interface CalendarGridProps {
    onEventClick?: () => void;
}

const CalendarGrid = ({ onEventClick }: CalendarGridProps) => {
    const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1)); // October 2025

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const currentMonthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Calculate days in current month
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    // Calculate the starting day of the week (0 = Sunday, 6 = Saturday)
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const renderEvent = (day: number) => {
        const dayEvent = EVENTS.find(e => e.date === day);
        if (!dayEvent || !dayEvent.cases) return null;

        return dayEvent.cases.map((caseName, idx) => (
            <div
                key={idx}
                className={styles.caseItem}
                onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.();
                }}
                style={{ cursor: 'pointer' }}
            >
                <Gavel size={10} className={styles.caseIcon} />
                <span className={styles.caseName}>{caseName}</span>
            </div>
        ));
    };

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.nav}>
                    <button className={styles.navBtn} onClick={goToPreviousMonth}>
                        <ChevronLeft size={20} />
                    </button>
                    <span className={styles.monthLabel}>{currentMonthYear}</span>
                    <button className={styles.navBtn} onClick={goToNextMonth}>
                        <ChevronRight size={20} />
                    </button>
                </div>
                <button className={styles.todayBtn} onClick={goToToday}>Today</button>
            </div>

            <div className={styles.grid}>
                {DAYS.map(day => (
                    <div key={day} className={styles.dayHeader}>{day}</div>
                ))}

                {/* Empty cells for days before the first day of the month */}
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                    <div key={`empty-${i}`} className={styles.dayCell}></div>
                ))}

                {/* Actual days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <div key={day} className={styles.dayCell}>
                        <span className={styles.dayNumber}>{day}</span>
                        <div className={styles.events}>
                            {renderEvent(day)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarGrid;
