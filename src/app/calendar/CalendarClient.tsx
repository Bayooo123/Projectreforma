"use client";

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import AddMatterModal from '@/components/calendar/AddMatterModal';
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
        caseNumber: string;
        name: string;
        client: { name: string };
        assignedLawyer: { id: string; name: string | null };
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
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    // Note: selectedMatter is still needed for the detail modal, 
    // but the EVENT might be what we click.
    // For now, when clicking an event, we'll fetch the full matter details?
    // Or just pass the partial matter data from the event. 
    // MatterDetailModal needs a 'Matter' object. 
    // Let's stick to existing modal for continuity, we can fetch full matter on click if needed.
    const [selectedMatter, setSelectedMatter] = useState<any | null>(null);
    const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filter events based on search
    const filteredEvents = events.filter(event => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                event.matter.name.toLowerCase().includes(query) ||
                event.matter.caseNumber.toLowerCase().includes(query) ||
                event.matter.client?.name.toLowerCase().includes(query) ||
                (event.title && event.title.toLowerCase().includes(query));

            if (!matchesSearch) return false;
        }
        return true;
    });

    // We no longer need to fetch "matters for month" because we fetch ALL events upfront usually?
    // Or we should fetch events for the month if the dataset is huge.
    // The previous implementation fetched for specific month.
    // 'getCourtEvents' fetched everything.
    // If we want to stick to month-based fetching, we should have added month params to getCourtEvents.
    // For now, let's assume getCourtEvents returns enough data (or all).
    // If we need to refresh data:

    const refreshEvents = async () => {
        setIsLoadingMonth(true);
        try {
            const { getCourtEvents } = await import('@/app/actions/court-dates');
            const newEvents = await getCourtEvents(workspaceId);
            setEvents(newEvents);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingMonth(false);
        }
    };

    const handleEventClick = async (event: CourtEvent) => {
        setIsLoadingMonth(true); // Re-use loading state or add specific one
        try {
            // Dynamically import to avoid server-action-in-client-bundle issues if any, 
            // though we can import at top level usually.
            const { getMatterById } = await import('@/app/actions/matters');
            // We need to fetch the matter to show details
            // Ideally we shouldn't fetch if we have it, but we need relations like Briefs
            const matter = await getMatterById(event.matterId);
            if (matter) {
                // Cast to compatible type if needed or ensure getMatterById returns compatible type
                // The Matter interface here is local, we might need to update it or cast
                setSelectedMatter(matter as any);
                setIsDetailModalOpen(true);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to load matter details');
        } finally {
            setIsLoadingMonth(false);
        }
    };

    const handleAddSuccess = () => {
        refreshEvents();
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
                    {/* Status filter might be less relevant for events, but could filter by matter status if we map it */}
                    <button
                        className={styles.addBtn}
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus size={18} />
                        <span>Add matter</span>
                    </button>
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
                onSuccess={handleAddSuccess}
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
