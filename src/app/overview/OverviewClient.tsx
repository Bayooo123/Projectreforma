'use client';

import { useState, useRef, type RefObject } from "react";
import { MetricCard } from "./components/MetricCard";
import { FirmPulse } from "./components/FirmPulse";
import { PendingTasksModal } from "./components/PendingTasksModal";
import { CourtDatesModal } from "./components/CourtDatesModal";
import { ActiveBriefsDropdown } from "./components/ActiveBriefsDropdown";
import { ListTodo, Calendar, Scale } from "lucide-react";

interface DashboardStats {
    pendingTasks: number;
    courtDates: number;
    activeBriefs: number;
}

interface OverviewClientProps {
    stats: DashboardStats;
    firstName: string;
}

export function OverviewClient({ stats, firstName }: OverviewClientProps) {
    // Modal & Dropdown States
    const [isPendingTasksOpen, setIsPendingTasksOpen] = useState(false);
    const [isCourtDatesOpen, setIsCourtDatesOpen] = useState(false);
    const [isBriefsDropdownOpen, setIsBriefsDropdownOpen] = useState(false);
    const [briefsAnchorRef, setBriefsAnchorRef] = useState<RefObject<HTMLDivElement | null> | null>(null);

    // Refs for anchors
    const activeBriefsRef = useRef<HTMLDivElement>(null);

    const handleBriefsClick = () => {
        setBriefsAnchorRef(activeBriefsRef); // Set the anchor
        setIsBriefsDropdownOpen(!isBriefsDropdownOpen);
    };

    const currentDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="mx-auto max-w-[1400px] p-10">
            {/* Header */}
            <div className="mb-10">
                <div className="mb-2">
                    <h1 className="text-[32px] font-semibold text-primary leading-tight">
                        {getGreeting()}, {firstName}
                    </h1>
                </div>
                <p className="text-sm font-normal text-secondary uppercase tracking-[0.5px]">
                    {currentDate}
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {/* Card 1: Pending Tasks */}
                <MetricCard
                    title="Pending Tasks"
                    value={stats.pendingTasks}
                    subtitle={stats.pendingTasks === 1 ? "Requiring attention" : "Requiring attention"}
                    icon={ListTodo}
                    onClick={() => setIsPendingTasksOpen(true)}
                />

                {/* Card 2: Court Dates */}
                <MetricCard
                    title="Upcoming Court Dates"
                    value={stats.courtDates}
                    subtitle="Next 7 Days"
                    icon={Calendar}
                    onClick={() => setIsCourtDatesOpen(true)}
                />

                {/* Card 3: Active Briefs */}
                <div ref={activeBriefsRef} className="relative">
                    <MetricCard
                        title="Active Briefs"
                        value={stats.activeBriefs}
                        subtitle="Ongoing matters"
                        icon={Scale}
                        onClick={handleBriefsClick}
                        className={isBriefsDropdownOpen ? "ring-2 ring-teal-500/50" : ""}
                    />
                    <ActiveBriefsDropdown
                        isOpen={isBriefsDropdownOpen}
                        onClose={() => setIsBriefsDropdownOpen(false)}
                        anchorRef={activeBriefsRef}
                    />
                </div>
            </div>

            {/* Firm Pulse */}
            <FirmPulse />

            {/* Modals */}
            <PendingTasksModal
                isOpen={isPendingTasksOpen}
                onClose={() => setIsPendingTasksOpen(false)}
            />
            <CourtDatesModal
                isOpen={isCourtDatesOpen}
                onClose={() => setIsCourtDatesOpen(false)}
            />
        </div>
    );
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}
