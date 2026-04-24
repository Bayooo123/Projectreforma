"use client";

import { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import BicaWidget from '@/components/bica/BicaWidget';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
    children: ReactNode;
    user: any;
    workspace: any;
}

export default function AppLayout({ children, user, workspace }: AppLayoutProps) {
    return (
        <div className={styles.gridContainer}>
            <aside className={styles.sidebar}>
                <Sidebar user={user} workspace={workspace} />
            </aside>
            <div className={styles.mainContent}>
                <div className={styles.headerWrapper}>
                    <Header user={user} workspace={workspace} />
                </div>
                <main className={styles.contentArea}>
                    <div className={styles.contentContainer}>
                        {children}
                    </div>
                </main>
                <BottomNavigation />
            </div>
            <BicaWidget />
        </div>
    );
}
