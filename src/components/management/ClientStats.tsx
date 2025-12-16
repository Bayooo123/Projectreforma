"use client";

import { useState, useEffect } from 'react';
import { Users, Briefcase, DollarSign, Loader } from 'lucide-react';
import { getClientStats } from '@/app/actions/clients';
import styles from './ClientStats.module.css';

interface ClientStatsProps {
    workspaceId: string;
}

const ClientStats = ({ workspaceId }: ClientStatsProps) => {
    const [isLocked, setIsLocked] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState(['', '', '', '', '']); // 5 digit pin
    const [pinError, setPinError] = useState('');
    const [verifying, setVerifying] = useState(false);

    // Dynamic imports to avoid server/client mixups if needed, but actions are safe
    // We import validateRevenuePin from actions

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const result = await getClientStats(workspaceId);
                if (result.success && result.data) {
                    setStats({
                        totalClients: result.data.totalClients,
                        activeMatters: result.data.activeMatters,
                        totalRevenue: result.data.totalRevenue || 0,
                    });
                    // @ts-ignore - isRevenueLocked added in action but type might lag in IDE
                    if (result.data.isRevenueLocked) {
                        setIsLocked(true);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [workspaceId]);

    const handlePinChange = (index: number, value: string) => {
        if (value.length > 1) return; // Prevent multiple chars
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next
        if (value && index < 4) {
            const nextInput = document.getElementById(`pin-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setPinError('');

        const pinString = pin.join('');
        if (pinString.length !== 5) {
            setPinError('Enter 5 digits');
            setVerifying(false);
            return;
        }

        try {
            // Dynamically import to ensure we use the action
            const { validateRevenuePin } = await import('@/app/actions/clients');
            const result = await validateRevenuePin(workspaceId, pinString);

            if (result.success) {
                setStats(prev => ({ ...prev, totalRevenue: result.totalRevenue || 0 }));
                setIsLocked(false);
                setShowPinModal(false);
                setPin(['', '', '', '', '']); // Reset pin
            } else {
                setPinError('Invalid PIN');
            }
        } catch (error) {
            console.error(error);
            setPinError('Verification failed');
        } finally {
            setVerifying(false);
        }
    };

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

            <div className={styles.statCard} style={{ position: 'relative' }}>
                <div className={styles.iconWrapper} style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
                    <DollarSign size={20} />
                </div>
                <div className={styles.content}>
                    <p className={styles.label}>Total Revenue</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isLocked ? (
                            <button
                                onClick={() => setShowPinModal(true)}
                                style={{
                                    border: 'none',
                                    background: 'rgba(0,0,0,0.05)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: '#059669', // Match icon color
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                <LockIcon size={12} /> View
                            </button>
                        ) : (
                            <p className={styles.value}>{formatCurrency(stats.totalRevenue)}</p>
                        )}
                    </div>
                </div>

                {/* PIN Modal / Popover */}
                {showPinModal && (
                    <div className={styles.overlay} onClick={() => setShowPinModal(false)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.4)', zIndex: 100,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                        <div onClick={e => e.stopPropagation()}
                            style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '300px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>Enter Security PIN</h3>
                            <form onSubmit={handleUnlock}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1rem' }}>
                                    {pin.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            id={`pin-${idx}`}
                                            type="password"
                                            value={digit}
                                            onChange={e => handlePinChange(idx, e.target.value)}
                                            style={{
                                                width: '40px', height: '40px', textAlign: 'center', fontSize: '1.25rem',
                                                border: '1px solid #e5e7eb', borderRadius: '4px'
                                            }}
                                            maxLength={1}
                                        />
                                    ))}
                                </div>
                                {pinError && <p style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>{pinError}</p>}
                                <button
                                    type="submit" disabled={verifying}
                                    style={{
                                        width: '100%', padding: '0.75rem', background: '#059669', color: 'white',
                                        border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer'
                                    }}>
                                    {verifying ? <Loader className="spin" size={16} /> : 'Unlock Revenue'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper Icon
const LockIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

export default ClientStats;
