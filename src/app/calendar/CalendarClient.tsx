"use client";

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import AddMatterModal from '@/components/calendar/AddMatterModal';
import MatterDetailModal from '@/components/calendar/MatterDetailModal';
import { getMattersForMonth } from '@/lib/matters';
import styles from './page.module.css';

interface Matter {
    id: string;
    caseNumber: string;
    name: string;
    clientId: string;
    assignedLawyerId: string;
    workspaceId: string;
    court: string | null;
    judge: string | null;
    status: string;
    nextCourtDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    client: {
        id: string;
        name: string;
    };
    assignedLawyer: {
        id: string;
        name: string | null;
    };
    briefs: {
        id: string;
        briefNumber: string;
        name: string;
    }[];
}

interface CalendarClientProps {
    initialMatters: Matter[];
    workspaceId: string;
    userId: string;
}

export default function CalendarClient({
    initialMatters,
    workspaceId,
    userId,
}: CalendarClientProps) {
    const [matters, setMatters] = useState<Matter[]>(initialMatters);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filter matters based on search and status
    const filteredMatters = matters.filter(matter => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                matter.name.toLowerCase().includes(query) ||
                matter.caseNumber.toLowerCase().includes(query) ||
                matter.client?.name.toLowerCase().includes(query) ||
                matter.court?.toLowerCase().includes(query) ||
                matter.briefs?.some(b =>
                    b.name.toLowerCase().includes(query) ||
                    b.briefNumber.toLowerCase().includes(query)
                );
            if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== 'all' && matter.status !== statusFilter) {
            return false;
        }

        return true;
    });

    // Fetch matters when month changes
    useEffect(() => {
        const fetchMatters = async () => {
            setIsLoadingMonth(true);
            try {
                const newMatters = await getMattersForMonth(
                    workspaceId,
                    currentDate.getFullYear(),
                    currentDate.getMonth()
                );
                setMatters(newMatters);
            } catch (error) {
                console.error('Error fetching matters:', error);
            } finally {
                setIsLoadingMonth(false);
            }
        };

        fetchMatters();
    }, [currentDate, workspaceId]);

    const handleEventClick = (matter: Matter) => {
        setSelectedMatter(matter);
        setIsDetailModalOpen(true);
    };

    const handleAddSuccess = () => {
        // Refresh matters after adding
        const fetchMatters = async () => {
            const newMatters = await getMattersForMonth(
                workspaceId,
                currentDate.getFullYear(),
                currentDate.getMonth()
            );
            setMatters(newMatters);
        };
        fetchMatters();
    };

    const handleDetailClose = () => {
        setIsDetailModalOpen(false);
        setSelectedMatter(null);
        // Refresh matters in case of updates
        const fetchMatters = async () => {
            const newMatters = await getMattersForMonth(
                workspaceId,
                currentDate.getFullYear(),
                currentDate.getMonth()
            );
            setMatters(newMatters);
        };
        fetchMatters();
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
                    <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="closed">Closed</option>
                    </select>
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
                matters={filteredMatters}
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
