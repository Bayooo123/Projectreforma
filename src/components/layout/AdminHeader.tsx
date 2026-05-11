"use client";

import { Shield } from 'lucide-react';
import styles from './AdminHeader.module.css';

interface AdminHeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
    };
}

export default function AdminHeader({ user }: AdminHeaderProps) {
    return (
        <header className={styles.header}>
            <div className={styles.left}>
                {/* intentionally empty — page title lives in each page */}
            </div>
            <div className={styles.right}>
                <div className={styles.badge}>
                    <Shield size={13} />
                    Platform Admin
                </div>
                <div className={styles.userBlock}>
                    <div className={styles.avatar}>
                        {(user?.name || user?.email || 'A')[0].toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{user?.name || user?.email}</span>
                        <span className={styles.userRole}>Platform Admin</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
