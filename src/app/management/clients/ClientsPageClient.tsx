"use client";

import { useState, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import ClientList from '@/components/management/ClientList';
import ClientStats from '@/components/management/ClientStats';
import AddClientModal from '@/components/management/AddClientModal';
import { getClientById } from '@/app/actions/clients';
import styles from './page.module.css';

interface ClientsPageClientProps {
    workspaceId: string;
    userId: string;
    letterheadUrl?: string | null;
}

export default function ClientsPageClient({ workspaceId, userId, letterheadUrl }: ClientsPageClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId) {
            getClientById(editId).then(result => {
                if (result.success) {
                    setEditingClient(result.data);
                    setIsModalOpen(true);
                }
            });
        }
    }, [searchParams]);

    const handleClientSuccess = () => {
        setRefreshKey(prev => prev + 1);
        setEditingClient(null);
        // Clear search params if they were used to trigger edit
        if (searchParams.get('edit')) {
            router.replace('/management/clients');
        }
    };

    const handleEditClient = (client: any) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleAddClient = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const closeClientModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
        if (searchParams.get('edit')) {
            router.replace('/management/clients');
        }
    };

    return (
        <>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Clients</h1>
                    <p className={styles.subtitle}>Manage client relationships and track engagement</p>
                </div>
                <div className={styles.actions}>
                    <button className={styles.addBtn} onClick={handleAddClient}>
                        <Plus size={18} />
                        <span>Add New Client</span>
                    </button>
                </div>
            </div>

            <ClientStats key={`stats-${refreshKey}`} workspaceId={workspaceId} />

            <ClientList
                key={`list-${refreshKey}`}
                workspaceId={workspaceId}
                letterheadUrl={letterheadUrl}
                onEditClient={handleEditClient}
            />

            <AddClientModal
                isOpen={isModalOpen}
                onClose={closeClientModal}
                workspaceId={workspaceId}
                onSuccess={handleClientSuccess}
                client={editingClient}
            />
        </>
    );
}
