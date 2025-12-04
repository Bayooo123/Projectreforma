"use client";

import { useState, useEffect } from 'react';
import { Users, Briefcase, DollarSign, Loader } from 'lucide-react';
import { getClientStats } from '@/app/actions/clients';
import styles from './ClientStats.module.css';

interface ClientStatsProps {
    workspaceId: string;
}

const ClientStats = ({ workspaceId }: ClientStatsProps) => {
    const [stats, setStats] = useState({
        totalClients: 0,
        activeMatters: 0,
        totalRevenue: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const result = await getClientStats(workspaceId);
                if (result.success && result.data) {
                    setStats({
                        totalClients: result.data.totalClients,
                        activeMatters: result.data.activeMatters,
                        totalRevenue: result.data.totalRevenue,
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

    const formatCurrency = (amount: number) => {
        // Amount is in kobo, convert to naira
        return `₦${(amount / 100).toLocaleString()}`;
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
            <div className={styles.statCard}>
                <div className={styles.iconWrapper} style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
                    <Users size={20} />
                </div>
                <div className={styles.content}>
                    <p className={styles.label}>Total Clients</p>
                    <p className={styles.value}>{stats.totalClients}</p>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.iconWrapper} style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                    <Briefcase size={20} />
                </div>
                <div className={styles.content}>
                    <p className={styles.label}>Active Matters</p>
                    <p className={styles.value}>{stats.activeMatters}</p>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.iconWrapper} style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
                    <DollarSign size={20} />
                </div>
                <div className={styles.content}>
                    <p className={styles.label}>Total Revenue</p>
                    <p className={styles.value}>{formatCurrency(stats.totalRevenue)}</p>
                </div>
            </div>
        </div>
    );
};

export default ClientStats;
