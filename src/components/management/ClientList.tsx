"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, FileText, DollarSign, Loader } from 'lucide-react';
import { getClients } from '@/app/actions/clients';
import InvoiceModal from './InvoiceModal';
import PaymentModal from './PaymentModal';
import styles from './ClientList.module.css';

interface Client {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    industry: string | null;
    status: string;
    createdAt: Date;
    lastActivity?: Date;
    activeMatters?: number;
    _count: {
        matters: number;
        invoices: number;
        payments: number;
    };
}

interface ClientListProps {
    workspaceId: string;
}

const ClientList = ({ workspaceId }: ClientListProps) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<{ name: string; id: string } | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const result = await getClients(workspaceId);
            if (result.success && result.data) {
                setClients(result.data);
                setFilteredClients(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, [workspaceId]);

    // Filter clients based on search and status
    useEffect(() => {
        let filtered = clients;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(client =>
                client.name.toLowerCase().includes(query) ||
                client.email.toLowerCase().includes(query) ||
                client.company?.toLowerCase().includes(query) ||
                client.industry?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(client => client.status === statusFilter);
        }

        setFilteredClients(filtered);
    }, [searchQuery, statusFilter, clients]);

    const handleCreateInvoice = (clientName: string, clientId: string) => {
        setSelectedClient({ name: clientName, id: clientId });
        setIsInvoiceModalOpen(true);
    };

    const handleRecordPayment = (clientName: string, clientId: string) => {
        setSelectedClient({ name: clientName, id: clientId });
        setIsPaymentModalOpen(true);
    };

    const formatLastActivity = (date?: Date) => {
        if (!date) return 'No activity';

        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
        return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search clients..."
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
                </select>
            </div>

            {isLoading ? (
                <div className={styles.loading}>
                    <Loader size={32} className="spin" />
                    <p>Loading clients...</p>
                </div>
            ) : filteredClients.length === 0 ? (
                <div className={styles.empty}>
                    <p>No clients found</p>
                    {searchQuery && <p className={styles.emptyHint}>Try adjusting your search</p>}
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.checkboxCell}><input type="checkbox" /></th>
                                <th>Name</th>
                                <th>Company</th>
                                <th>Industry</th>
                                <th>Matters</th>
                                <th>Last Activity</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map((client) => (
                                <tr key={client.id}>
                                    <td className={styles.checkboxCell}><input type="checkbox" /></td>
                                    <td>
                                        <div className={styles.clientInfo}>
                                            <span className={styles.clientName}>{client.name}</span>
                                            <span className={styles.clientEmail}>{client.email}</span>
                                        </div>
                                    </td>
                                    <td>{client.company || '-'}</td>
                                    <td>{client.industry || '-'}</td>
                                    <td>{client._count.matters}</td>
                                    <td>{formatLastActivity(client.lastActivity)}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[client.status.toLowerCase()]}`}>
                                            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <button
                                                className={styles.iconBtn}
                                                title="Create Invoice"
                                                onClick={() => handleCreateInvoice(client.name, client.id)}
                                            >
                                                <FileText size={18} />
                                            </button>
                                            <button
                                                className={styles.iconBtn}
                                                title="Record Payment"
                                                onClick={() => handleRecordPayment(client.name, client.id)}
                                            >
                                                <DollarSign size={18} />
                                            </button>
                                            <button className={styles.iconBtn} title="More Options">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <InvoiceModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                clientName={selectedClient?.name || ''}
                clientId={selectedClient?.id || ''}
            />
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                clientName={selectedClient?.name || ''}
            />
        </div>
    );
};

export default ClientList;
