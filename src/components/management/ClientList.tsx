"use client";

import { useState } from 'react';
import { Search, Filter, MoreVertical, FileText, DollarSign } from 'lucide-react';
import InvoiceModal from './InvoiceModal';
import PaymentModal from './PaymentModal';
import styles from './ClientList.module.css';

// Mock Data
const CLIENTS = [
    { id: '1', name: 'Stellar Corporation', email: 'contact@stellar.com', company: 'Stellar Corp', industry: 'Tech', matters: 12, lastActivity: '2 hours ago', status: 'Active' },
    { id: '2', name: 'Green Meadow Estates', email: 'info@greenmeadow.com', company: 'Green Meadow', industry: 'Real Estate', matters: 5, lastActivity: '1 day ago', status: 'Active' },
    { id: '3', name: 'OmniTech Solutions', email: 'support@omnitech.com', company: 'OmniTech', industry: 'Tech', matters: 8, lastActivity: '3 days ago', status: 'Inactive' },
    { id: '4', name: 'Maritime Logistics', email: 'ops@maritime.com', company: 'Maritime Log', industry: 'Logistics', matters: 15, lastActivity: '5 hours ago', status: 'Active' },
    { id: '5', name: 'Phoenix Group', email: 'admin@phoenix.com', company: 'Phoenix Grp', industry: 'Finance', matters: 3, lastActivity: '1 week ago', status: 'Active' },
];

const ClientList = () => {
    const [selectedClient, setSelectedClient] = useState<{ name: string; id: string } | null>(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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
                        {CLIENTS.map((client) => (
                            <tr key={client.id}>
                                <td className={styles.checkboxCell}><input type="checkbox" /></td>
                                <td>
                                    <div className={styles.clientInfo}>
                                        <span className={styles.clientName}>{client.name}</span>
                                        <span className={styles.clientEmail}>{client.email}</span>
                                    </div>
                                </td>
                                <td>{client.company}</td>
                                <td>{client.industry}</td>
                                <td>{client.matters}</td>
                                <td>{client.lastActivity}</td>
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
                        ))}
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
