"use client";

import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import ClientList from '@/components/management/ClientList';
import ClientStats from '@/components/management/ClientStats';
import AddClientModal from '@/components/management/AddClientModal';
import ViewAllInvoicesModal from '@/components/management/ViewAllInvoicesModal';
import ViewAllPaymentsModal from '@/components/management/ViewAllPaymentsModal';
import { getClientById } from '@/app/actions/clients';
import styles from './page.module.css';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Icon, Pill } from '@/components/mobile/MobileShared';

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
    const [mobileSearch, setMobileSearch] = useState('');
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

    const isMobile = useIsMobile();

    if (isMobile) {
        const filteredClients = initialClients.filter((c: any) =>
            !mobileSearch ||
            c.name?.toLowerCase().includes(mobileSearch.toLowerCase()) ||
            c.email?.toLowerCase().includes(mobileSearch.toLowerCase()) ||
            (c.company ?? '').toLowerCase().includes(mobileSearch.toLowerCase())
        );
        const activeCount = initialClients.filter((c: any) => c.status === 'ACTIVE').length;
        const totalMatters = initialClients.reduce((s: number, c: any) => s + (c._count?.matters ?? c.activeMatters ?? 0), 0);

        return (
            <>
                <div className="rm-screen">
                    <div className="rm-scroll">
                        {/* Header */}
                        <div className="rm-hdr" style={{ borderBottom: '1px solid var(--rm-border)' }}>
                            <div className="rm-hdr-row" style={{ alignItems: 'center' }}>
                                <div>
                                    <span className="rm-eyebrow">Management</span>
                                    <h1 className="rm-h1">Clients</h1>
                                </div>
                                <button className="rm-icon-btn dark" onClick={handleAddClient}>
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="rm-search" style={{ margin: '14px 0 0' }}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={mobileSearch}
                                    onChange={e => setMobileSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Stat chips */}
                        <div className="rm-chips-scroll">
                            <div className="rm-mchip">
                                <div className="ic" style={{ background: '#ECFDF5', color: '#065F46' }}>
                                    <Icon n="users" s={16} />
                                </div>
                                <div className="v">{initialClients.length}</div>
                                <div className="l">Total</div>
                            </div>
                            <div className="rm-mchip">
                                <div className="ic" style={{ background: '#ECFDF5', color: '#065F46' }}>
                                    <Icon n="check" s={16} />
                                </div>
                                <div className="v">{activeCount}</div>
                                <div className="l">Active</div>
                            </div>
                            <div className="rm-mchip">
                                <div className="ic" style={{ background: '#EEF4FF', color: '#1E40AF' }}>
                                    <Icon n="file" s={16} />
                                </div>
                                <div className="v">{totalMatters}</div>
                                <div className="l">Matters</div>
                            </div>
                        </div>

                        {/* Client list */}
                        <div className="rm-sec-label">
                            <span className="t">Clients ({filteredClients.length})</span>
                            <button
                                className="a"
                                onClick={() => setShowInvoicesModal(true)}
                            >
                                Invoices <Icon n="chevR" s={13} />
                            </button>
                        </div>
                        <div className="rm-list">
                            {filteredClients.length === 0 ? (
                                <div className="rm-empty">
                                    <Icon n="users" s={32} c="#94A3B8" />
                                    <p>No clients found</p>
                                </div>
                            ) : filteredClients.map((client: any) => (
                                <div
                                    key={client.id}
                                    className="rm-brief-card"
                                    onClick={() => handleEditClient(client)}
                                >
                                    <div className="row1">
                                        <div style={{ minWidth: 0 }}>
                                            <div className="nm">{client.name}</div>
                                            <div className="no">{client.email}</div>
                                        </div>
                                        <Pill kind={client.status === 'ACTIVE' ? 'active' : 'inactive'}>
                                            {client.status}
                                        </Pill>
                                    </div>
                                    <div className="row2">
                                        {client.company && (
                                            <div className="kv">
                                                <Icon n="building" s={13} c="#94A3B8" />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                                                    {client.company}
                                                </span>
                                            </div>
                                        )}
                                        <div className="docs">
                                            <Icon n="file" s={13} />
                                            <span>{client._count?.matters ?? client.activeMatters ?? 0} matters</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FAB */}
                    <div className="rm-cta-fixed">
                        <button className="rm-btn-primary" onClick={handleAddClient}>
                            <Icon n="plus" s={18} />
                            Add New Client
                        </button>
                    </div>
                </div>

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

    return (
        <>
            <div className={styles.header} style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)', flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginBottom: '1.5rem' } : undefined}>
                <div>
                    <h1 className={styles.title}>Clients</h1>
                    <p className={styles.subtitle}>Manage client relationships and track engagement</p>
                </div>
                <div className={styles.actions} style={isMobile ? { width: '100%', overflowX: 'auto', paddingBottom: 4 } : undefined}>
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
