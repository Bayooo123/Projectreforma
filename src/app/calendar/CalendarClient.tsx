"use client";

import { useState, useEffect } from 'react';
import { Plus, Gavel } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import AddMatterModal from '@/components/calendar/AddMatterModal';
import RecordProceedingModal from '@/components/calendar/RecordProceedingModal'; // New Import
import MatterDetailModal from '@/components/calendar/MatterDetailModal';
import { getMattersForMonth } from '@/lib/matters';
import styles from './page.module.css';

interface CourtEvent {
    id: string;
    date: Date;
    title: string | null;
    proceedings: string | null;
    adjournedFor: string | null;
    matterId: string;
    matter: {
        id: string;
        caseNumber: string | null;
        name: string;
        client?: { name: string } | null;
        lawyers: {
            lawyer: {
                id: string;
                name: string | null;
            };
            role: string;
        }[];
    };
    appearances: { id: string; name: string | null; image: string | null }[];
}

interface CalendarClientProps {
    initialEvents: CourtEvent[];
    workspaceId: string;
    userId: string;
}

export default function CalendarClient({
    initialEvents,
    workspaceId,
    userId,
}: CalendarClientProps) {
    const [events, setEvents] = useState<CourtEvent[]>(initialEvents);

    // Sync state with props when revalidation occurs
    useEffect(() => {
        setEvents(initialEvents);
    }, [initialEvents]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false); // New state
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // ... (keep existing state)
    const [selectedMatter, setSelectedMatter] = useState<any | null>(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // ... (keep filtering logic)
    const filteredEvents = events.filter(event => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                event.matter.name.toLowerCase().includes(query) ||
                (event.matter.caseNumber?.toLowerCase().includes(query)) ||
                (event.matter.client?.name && event.matter.client.name.toLowerCase().includes(query)) ||
                (event.title && event.title.toLowerCase().includes(query))
            );
        }
        return true;
    });

    // ... (keep refreshEvents)
    const refreshEvents = async () => {
        console.log('Refreshing events...'); // Debug log
        try {
            const { getCourtEvents } = await import('@/app/actions/court-dates');
            const newEvents = await getCourtEvents(workspaceId);
            setEvents(newEvents);
        } catch (e) {
            console.error(e);
        }
    };

    // ... (keep handleEventClick, handleDetailClose)
    const handleEventClick = async (event: CourtEvent) => {
        // Instant feedback: Open modal with data we already have
        setSelectedMatter({
            ...event.matter,
            workspaceId: workspaceId, // Ensure workspaceId is passed for lawyer fetching
            briefs: [],
            courtDates: [],
            status: 'active', // Fallback status
            nextCourtDate: event.date,
            court: null,
            judge: null,
        });
        setIsDetailModalOpen(true);

        // Fetch full-fidelity details in background
        try {
            const { getMatterById } = await import('@/app/actions/matters');
            const fullMatter = await getMatterById(event.matterId);
            if (fullMatter) {
                setSelectedMatter(fullMatter as any);
            }
        } catch (e) {
            console.error('Background fetch failed:', e);
            // We don't alert here to avoid interrupting the user's preview
        }
    };

    const handleDetailClose = () => {
        setIsDetailModalOpen(false);
        setSelectedMatter(null);
        refreshEvents();
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Litigation tracker</h1>
                    <p className={styles.subtitle}>Track court dates and case proceedings</p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.searchWrapper}>
                        <input
                            type="text"
                            placeholder="Search matters..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Primary Actions Split */}
                    <div className="flex gap-3">
                        {/* Action 1: Create New Matter (Comprehensive) */}
                        <button
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <Plus size={18} className="text-slate-500" />
                            <span>Create New Matter</span>
                        </button>

                        {/* Action 2: Record Court Proceeding (Fast/Minimal) */}
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                            onClick={() => setIsRecordModalOpen(true)}
                        >
                            <Gavel size={18} />
                            <span>Record Court Proceeding</span>
                        </button>
                    </div>
                </div>
            </div>

            <CalendarGrid
                events={filteredEvents}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onEventClick={handleEventClick}
                isLoading={isLoadingMonth}
            />

            <AddMatterModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={refreshEvents}
            />

            <RecordProceedingModal
                isOpen={isRecordModalOpen}
                onClose={() => setIsRecordModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={refreshEvents}
            />

            {selectedMatter && (
                <MatterDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={handleDetailClose}
                    matter={selectedMatter}
                    userId={userId}
                />
            )}
        </div>
    );
}
