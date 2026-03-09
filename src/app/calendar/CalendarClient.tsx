"use client";

import { useState, useEffect } from 'react';
import { Plus, Gavel } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import MatterDetailModal from '@/components/calendar/MatterDetailModal';
import ScheduleMeetingModal from '@/components/calendar/ScheduleMeetingModal';
import RecordMeetingModal from '@/components/calendar/RecordMeetingModal';
import AddMatterModal from '@/components/calendar/AddMatterModal';
import { getMattersForMonth } from '@/lib/matters';
import styles from './page.module.css';

import { CalendarEvent, CalendarEventType } from '@/components/calendar/CalendarGrid';
import { Matter } from '@/types/legal';

interface CalendarClientProps {
    initialEvents: CalendarEvent[];
    workspaceId: string;
    userId: string;
}

export default function CalendarClient({
    initialEvents,
    workspaceId,
    userId,
}: CalendarClientProps) {
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

    // Sync state with props when revalidation occurs
    useEffect(() => {
        setEvents(initialEvents);
    }, [initialEvents]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isScheduleMeetingModalOpen, setIsScheduleMeetingModalOpen] = useState(false);
    const [isRecordMeetingModalOpen, setIsRecordMeetingModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<CalendarEventType | 'ALL'>('ALL');
    const [filterCategory, setFilterCategory] = useState<'UPCOMING' | 'PAST' | 'ALL'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Unified Filtering Logic
    const filteredEvents = events.filter(event => {
        const queryMatch = !searchQuery || (
            event.matter?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.matter?.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const typeMatch = filterType === 'ALL' || event.type === filterType;

        const isPast = new Date(event.date) < new Date();
        const categoryMatch = filterCategory === 'ALL' ||
            (filterCategory === 'UPCOMING' && !isPast) ||
            (filterCategory === 'PAST' && isPast);

        // Date Range Match
        const eventDate = new Date(event.date);
        const rangeMatch = (!startDate || eventDate >= new Date(startDate)) &&
            (!endDate || eventDate <= new Date(endDate));

        return queryMatch && typeMatch && categoryMatch && rangeMatch;
    });

    const refreshEvents = async (silent = false) => {
        if (!silent) console.log('Refreshing events...');
        try {
            const { getCalendarEvents } = await import('@/app/actions/calendar-events');
            const newEvents = await getCalendarEvents(workspaceId);
            setEvents(newEvents);
        } catch (e) {
            console.error(e);
        }
    };

    // AUTOMATION: Background Polling (30 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            refreshEvents(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [workspaceId]);

    // ... (keep handleEventClick, handleDetailClose)
    const handleEventClick = async (event: CalendarEvent) => {
        // Instant feedback: Open modal with data we already have
        setSelectedMatter({
            ...event.matter,
            workspaceId: workspaceId, 
            briefs: [],
            calendarEntries: [],
            meetingRecords: [],
            status: 'active',
            nextCourtDate: event.date,
            court: null,
            judge: null,
            lawyers: [],
            client: { id: '', name: event.matter?.client?.name || 'Loading...' },
        } as Matter);
        setIsDetailModalOpen(true);

        // Fetch full-fidelity details in background
        if (event.matterId) {
            try {
                const { getMatterById } = await import('@/app/actions/matters');
                const fullMatter = await getMatterById(event.matterId);
                if (fullMatter) {
                    setSelectedMatter(fullMatter as any);
                }
            } catch (e) {
                console.error('Background fetch failed:', e);
            }
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
                    <h1 className={styles.title}>Legal Calendar</h1>
                    <p className={styles.subtitle}>Unified practice scheduling & documentation</p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.actionButtons}>
                        <button
                            className={styles.btnSecondary}
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <Plus size={18} />
                            <span>New Matter</span>
                        </button>

                        <button
                            className={styles.btnSecondary}
                            onClick={() => setIsScheduleMeetingModalOpen(true)}
                        >
                            <Plus size={18} />
                            <span>Schedule Meeting</span>
                        </button>

                        <button
                            className={styles.btnPrimary}
                            onClick={() => setIsRecordMeetingModalOpen(true)}
                        >
                            <Gavel size={18} />
                            <span>Record Meeting</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.toolBar}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${filterCategory === 'ALL' && filterType === 'ALL' ? styles.activeTab : ''}`}
                        onClick={() => { setFilterCategory('ALL'); setFilterType('ALL'); }}
                    >All Events</button>
                    <button
                        className={`${styles.tab} ${filterCategory === 'UPCOMING' ? styles.activeTab : ''}`}
                        onClick={() => setFilterCategory('UPCOMING')}
                    >Upcoming</button>
                    <button
                        className={`${styles.tab} ${filterCategory === 'PAST' ? styles.activeTab : ''}`}
                        onClick={() => setFilterCategory('PAST')}
                    >Past</button>
                    <div className={styles.tabDivider} />
                    <button
                        className={`${styles.tab} ${filterType === 'COURT_DATE' ? styles.activeTab : ''}`}
                        onClick={() => setFilterType('COURT_DATE')}
                    >Court Dates</button>
                    <button
                        className={`${styles.tab} ${filterType === 'CLIENT_MEETING' || filterType === 'INTERNAL_MEETING' ? styles.activeTab : ''}`}
                        onClick={() => setFilterType('CLIENT_MEETING')}
                    >Meetings</button>
                </div>

                <div className={styles.filtersWrapper}>
                    <div className={styles.filterGroup}>
                        <label>Range:</label>
                        <input
                            type="date"
                            className={styles.dateInput}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span>to</span>
                        <input
                            type="date"
                            className={styles.dateInput}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className={styles.searchWrapper}>
                        <input
                            type="text"
                            placeholder="Search case, number or title..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.calendarSection}>
                <CalendarGrid
                    events={filteredEvents}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    onEventClick={handleEventClick}
                    isLoading={isLoadingMonth}
                />
            </div>

            {/* TODO: Implement ScheduleMeetingModal and RecordMeetingModal */}
            <AddMatterModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={refreshEvents}
            />

            <ScheduleMeetingModal
                isOpen={isScheduleMeetingModalOpen}
                onClose={() => setIsScheduleMeetingModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={refreshEvents}
            />

            <RecordMeetingModal
                isOpen={isRecordMeetingModalOpen}
                onClose={() => setIsRecordMeetingModalOpen(false)}
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
