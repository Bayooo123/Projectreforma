"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, Loader } from 'lucide-react';
import { getClientStats } from '@/app/actions/clients';
import ViewAllInvoicesModal from './ViewAllInvoicesModal';
import ViewAllPaymentsModal from './ViewAllPaymentsModal';
import styles from './ClientStats.module.css';

interface ClientStatsProps {
    workspaceId: string;
    letterheadUrl?: string | null;
}

const ClientStats = ({ workspaceId, letterheadUrl }: ClientStatsProps) => {
    const router = useRouter();
    const [stats, setStats] = useState({
        totalClients: 0,
        newClientsThisMonth: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [showPaymentsModal, setShowPaymentsModal] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const result = await getClientStats(workspaceId);
                if (result.success && result.data) {
                    setStats({
                        totalClients: result.data.totalClients,
                        newClientsThisMonth: result.data.newClientsThisMonth,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [workspaceId]);

    const handleCardClick = (filter?: string) => {
        const params = new URLSearchParams();
        if (filter) params.set('filter', filter);
        router.push(`/management/clients?${params.toString()}`);
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <Loader size={24} className="spin" />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Total Clients -> Reset Filter */}
            <div
                className={`${styles.statCard} cursor-pointer hover:shadow-md transition-all`}
                onClick={() => handleCardClick()}
            >
                <div className={styles.iconWrapper} style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
                    <Users size={18} />
                </div>
                <div className={styles.content}>
                    <p className={styles.label}>Total Clients</p>
                    <p className={styles.value}>{stats.totalClients}</p>
                </div>
            </div>

            {/* New Clients This Month */}
            <div className={styles.statCard}>
                <div className={styles.iconWrapper} style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
                    <UserPlus size={18} />
                </div>
                <div className={styles.content}>
                    <p className={styles.label}>New This Month</p>
                    <p className={styles.value}>{stats.newClientsThisMonth}</p>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                    onClick={() => setShowInvoicesModal(true)}
                    style={{
                        padding: '0.375rem 0.625rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    View All Invoices
                </button>
                <button
                    onClick={() => setShowPaymentsModal(true)}
                    style={{
                        padding: '0.375rem 0.625rem',
                        background: 'transparent',
                        color: 'var(--primary)',
                        border: '1px solid var(--primary)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    View All Payments
                </button>
            </div>

            {/* Modals */}
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
        </div>
    );
};

export default ClientStats;
