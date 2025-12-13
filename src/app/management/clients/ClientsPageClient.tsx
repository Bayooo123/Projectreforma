"use client";

import { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import ClientList from '@/components/management/ClientList';
import ClientStats from '@/components/management/ClientStats';
import AddClientModal from '@/components/management/AddClientModal';
import styles from './page.module.css';

interface ClientsPageClientProps {
    workspaceId: string;
    userId: string;
    letterheadUrl?: string | null;
}

export default function ClientsPageClient({ workspaceId, userId, letterheadUrl }: ClientsPageClientProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleClientAdded = () => {
        // Trigger refresh by changing key
        setRefreshKey(prev => prev + 1);
    };

    const handleExportData = () => {
        // TODO: Implement export functionality
        alert('Export functionality coming soon!');
    };

    return (
        <>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Clients</h1>
                    <p className={styles.subtitle}>Manage client relationships and track engagement</p>
                </div>
                <div className={styles.actions}>
                    <button className={styles.exportBtn} onClick={handleExportData}>
                        <Download size={18} />
                        <span>Export Data</span>
                    </button>
                    <button className={styles.addBtn} onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={18} />
                        <span>Add New Client</span>
                    </button>
                </div>
            </div>

            <ClientStats key={`stats-${refreshKey}`} workspaceId={workspaceId} />

            <ClientList key={`list-${refreshKey}`} workspaceId={workspaceId} letterheadUrl={letterheadUrl} />

            <AddClientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                workspaceId={workspaceId}
                onSuccess={handleClientAdded}
            />
        </>
    );
}
