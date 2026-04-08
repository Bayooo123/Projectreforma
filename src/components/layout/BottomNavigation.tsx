"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Gavel,
  Search,
  MessageSquare,
  Plus
} from 'lucide-react';
import styles from './BottomNavigation.module.css';
import { useState } from 'react';

const BottomNavigation = () => {
    const pathname = usePathname();
    const [showFabMenu, setShowFabMenu] = useState(false);

    const navItems = [
        { name: 'Home', href: '/management', icon: LayoutDashboard },
        { name: 'Briefs', href: '/briefs', icon: FileText },
        // FAB goes in the middle effectively, so we have a visual gap or just center it
        { name: 'Calendar', href: '/calendar', icon: Gavel },
        { name: 'AI', href: '/chat', icon: MessageSquare },
    ];

    const isActive = (path: string) => {
        if (path === '/management') return pathname === path;
        return pathname === path || pathname.startsWith(path + '/');
    };

    return (
        <>
            {/* Contextual FAB Menu for quick actions */}
            {showFabMenu && (
                <div className={styles.fabMenuOverlay} onClick={() => setShowFabMenu(false)}>
                    <div className={styles.fabMenuItems} onClick={e => e.stopPropagation()}>
                        <Link href="/briefs" onClick={() => setShowFabMenu(false)} className={styles.fabMenuItem}>
                            <FileText size={18} /> New Brief
                        </Link>
                        <Link href="/calendar" onClick={() => setShowFabMenu(false)} className={styles.fabMenuItem}>
                            <Gavel size={18} /> New Meeting
                        </Link>
                    </div>
                </div>
            )}

            <div className={styles.bottomNav}>
                <div className={styles.navItemsContainer}>
                    {navItems.slice(0, 2).map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                        >
                            <item.icon size={22} className={styles.icon} />
                            <span className={styles.label}>{item.name}</span>
                        </Link>
                    ))}

                    {/* Center FAB Button */}
                    <div className={styles.fabContainer}>
                        <button 
                            className={`${styles.fabButton} ${showFabMenu ? styles.fabActive : ''}`}
                            onClick={() => setShowFabMenu(!showFabMenu)}
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    {navItems.slice(2, 4).map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                        >
                            <item.icon size={22} className={styles.icon} />
                            <span className={styles.label}>{item.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
};

export default BottomNavigation;
