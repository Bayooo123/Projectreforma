"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, FileText, DollarSign } from 'lucide-react';
import InvoiceModal from './InvoiceModal';
import PaymentModal from './PaymentModal';
import styles from './ClientList.module.css';

// Mock Data


const ClientList = () => {
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<{ name: string; id: string } | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await fetch('/api/clients');
                if (response.ok) {
                    const data = await response.json();
                    setClients(data);
                }
            } catch (error) {
                console.error('Failed to fetch clients:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClients();
    }, []);

    const handleCreateInvoice = (clientName: string, clientId: string) => {
        setSelectedClient({ name: clientName, id: clientId });
        setIsInvoiceModalOpen(true);
    };

    const handleRecordPayment = (clientName: string, clientId: string) => {
        setSelectedClient({ name: clientName, id: clientId });
        setIsPaymentModalOpen(true);
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
                    />
                </div>
                <button className={styles.filterBtn}>
                    <Filter size={16} />
                    <span>Filter</span>
                </button>
            </div>

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
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className={styles.loadingCell}>Loading clients...</td>
                            </tr>
                        ) : clients.length === 0 ? (
                            <tr>
                                <td colSpan={8} className={styles.emptyCell}>No clients found.</td>
                            </tr>
                        ) : (
                            clients.map((client) => (
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
                                    <td>{client.matterCount || 0}</td>
                                    <td>{new Date(client.updatedAt).toLocaleDateString()}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[client.status.toLowerCase()]}`}>{client.status}</span>
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
