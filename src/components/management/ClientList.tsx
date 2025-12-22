"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MoreVertical, FileText, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { getClients } from '@/app/actions/clients';
import InvoiceModal from './InvoiceModal';
import PaymentModal from './PaymentModal';
import TableSkeleton from '@/components/ui/TableSkeleton';
import styles from './ClientList.module.css';

// Inline debounce hook since src/hooks doesn't exist
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

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

interface Invoice {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: Date | null;
}

interface ClientListProps {
    workspaceId: string;
    letterheadUrl?: string | null;
}

const ClientList = ({ workspaceId, letterheadUrl }: ClientListProps) => {
    // Data State
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination & Filter State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Debounce search to prevent server hammer
    const debouncedSearch = useDebounceValue(searchQuery, 400);

    // Modal State
    const [selectedClient, setSelectedClient] = useState<{ name: string; id: string } | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const fetchClients = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getClients(workspaceId, {
                page,
                limit,
                query: debouncedSearch,
                status: statusFilter !== 'all' ? statusFilter : undefined
            });

            if (result.success && result.data) {
                setClients(result.data as any); // Type assertion for now to match strict strict local types if they diverge slightly
                if (result.meta) {
                    setTotalPages(result.meta.totalPages);
                }
            }
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, page, limit, debouncedSearch, statusFilter]);

    // Fetch when dependencies change
    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    const handleCreateInvoice = (clientName: string, clientId: string) => {
        setSelectedClient({ name: clientName, id: clientId });
        setIsInvoiceModalOpen(true);
    };

    const handleRecordPayment = (clientName: string, clientId: string) => {
        setSelectedClient({ name: clientName, id: clientId });
        setSelectedInvoice(null);
        setIsPaymentModalOpen(true);
    };

    const handlePayInvoice = (invoice: any) => {
        setSelectedInvoice(invoice);
        setIsInvoiceModalOpen(false);
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
                <div className="py-8">
                    <TableSkeleton rows={5} />
                </div>
            ) : clients.length === 0 ? (
                <div className={styles.empty}>
                    <p>No clients found</p>
                    {searchQuery && <p className={styles.emptyHint}>Try adjusting your search</p>}
                </div>
            ) : (
                <>
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
                                {clients.map((client) => (
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
                                        <td>{client._count?.matters || 0}</td>
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

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 mt-auto">
                        <span className="text-sm text-slate-500">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={20} className="text-slate-600" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={20} className="text-slate-600" />
                            </button>
                        </div>
                    </div>
                </>
            )}

            <InvoiceModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                clientName={selectedClient?.name || ''}
                clientId={selectedClient?.id || ''}
                workspaceId={workspaceId}
                letterheadUrl={letterheadUrl}
                onRecordPayment={handlePayInvoice}
            />
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                clientName={selectedClient?.name || ''}
                clientId={selectedClient?.id || ''}
                selectedInvoice={selectedInvoice}
            />
        </div>
    );
};

export default ClientList;
