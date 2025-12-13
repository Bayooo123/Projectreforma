"use client";

import { useState } from 'react';
import { Settings } from 'lucide-react';
import ManagementTabs from '@/components/management/ManagementTabs';
import FinancialLog from '@/components/management/FinancialLog';
import WorkspaceSettingsModal from '@/components/management/WorkspaceSettingsModal';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

interface OfficeViewProps {
    workspace: any;
}

const OfficeView = ({ workspace }: OfficeViewProps) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const router = useRouter();

    const handleSettingsUpdate = () => {
        router.refresh(); // Refresh server data (to get new letterhead url)
        setIsSettingsOpen(false);
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className={styles.title}>Management</h1>
                        <p className={styles.subtitle}>Oversee clients, finances, and office operations.</p>
                    </div>
                    {workspace && (
                        <button
                            className={styles.settingsBtn}
                            onClick={() => setIsSettingsOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--surface)',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <Settings size={18} />
                            <span>Settings</span>
                        </button>
                    )}
                </div>
            </div>

            <ManagementTabs />

            <div className={styles.content}>
                <FinancialLog workspaceId={workspace?.id} />
            </div>

            {workspace && (
                <WorkspaceSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    workspaceId={workspace.id}
                    currentLetterheadUrl={workspace.letterheadUrl}
                    onUpdate={handleSettingsUpdate}
                />
            )}
        </div>
    );
};

export default OfficeView;
