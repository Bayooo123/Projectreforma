"use client";

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import ClientList from '@/components/management/ClientList';
import ClientStats from '@/components/management/ClientStats';
import AddClientModal from '@/components/management/AddClientModal';
import ViewAllInvoicesModal from '@/components/management/ViewAllInvoicesModal';
import ViewAllPaymentsModal from '@/components/management/ViewAllPaymentsModal';
import { getClientById } from '@/app/actions/clients';
import styles from './page.module.css';

interface ClientsPageClientProps {
    workspaceId: string;
    userId: string;
    letterheadUrl?: string | null;
    initialClients: any[];
    initialPages: number;
}

export default function ClientsPageClient({
    workspaceId,
    userId,
    letterheadUrl,
    initialClients,
    initialPages
}: ClientsPageClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [showPaymentsModal, setShowPaymentsModal] = useState(false);
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
                    <button
                        onClick={() => setShowInvoicesModal(true)}
                        style={{ padding: '0.45rem 0.75rem', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        All Invoices
                    </button>
                    <button
                        onClick={() => setShowPaymentsModal(true)}
                        style={{ padding: '0.45rem 0.75rem', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        All Payments
                    </button>
                    <button className={styles.addBtn} onClick={handleAddClient}>
                        <Plus size={18} />
                        <span>Add New Client</span>
                    </button>
                </div>
            </div>

            <ClientStats key={`stats-${refreshKey}`} workspaceId={workspaceId} letterheadUrl={letterheadUrl} />

            <ClientList
                key={`list-${refreshKey}`}
                workspaceId={workspaceId}
                letterheadUrl={letterheadUrl}
                onEditClient={handleEditClient}
                initialClients={initialClients}
                initialPages={initialPages}
            />

            <AddClientModal
                isOpen={isModalOpen}
                onClose={closeClientModal}
                workspaceId={workspaceId}
                onSuccess={handleClientSuccess}
                client={editingClient}
            />
            <ViewAllInvoicesModal
                isOpen={showInvoicesModal}
                onClose={() => setShowInvoicesModal(false)}
                workspaceId={workspaceId}
                letterheadUrl={letterheadUrl}
            />
            <ViewAllPaymentsModal
                isOpen={showPaymentsModal}
                onClose={() => setShowPaymentsModal(false)}
                workspaceId={workspaceId}
            />
        </>
    );
}
