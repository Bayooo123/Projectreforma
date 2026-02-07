"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Building2 } from 'lucide-react';
import styles from './ManagementTabs.module.css';

const ManagementTabs = () => {
    const pathname = usePathname();

    const isActive = (path: string) => pathname.includes(path);

    return (
        <div className={styles.tabs}>
            <Link
                href="/management/clients"
                className={`${styles.tab} ${isActive('/management/clients') ? styles.active : ''}`}
            >
                <Users size={18} />
                <span>Client Management</span>
            </Link>
            <Link
                href="/management/office"
                className={`${styles.tab} ${isActive('/management/office') ? styles.active : ''}`}
            >
                <Building2 size={18} />
                <span>Office Management</span>
            </Link>
        </div>
    );
};

export default ManagementTabs;
