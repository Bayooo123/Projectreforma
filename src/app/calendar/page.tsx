"use client";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import AddMatterModal from '@/components/calendar/AddMatterModal';
import MatterDetailModal from '@/components/calendar/MatterDetailModal';
import styles from './page.module.css';

export default function CalendarPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Litigation tracker</h1>
                    <p className={styles.subtitle}>Track court dates and case proceedings</p>
                </div>
                <button
                    className={styles.addBtn}
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <Plus size={18} />
                    <span>Add matter</span>
                </button>
            </div>

            <CalendarGrid onEventClick={() => setIsDetailModalOpen(true)} />

            <AddMatterModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <MatterDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
            />
        </div>
    );
}
