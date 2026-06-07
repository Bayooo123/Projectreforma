"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  FileText,
  Gavel,
  Users,
  Briefcase,
  BarChart2,
  ShieldCheck,
  Terminal,
  Inbox,
  Plus,
  LayoutGrid,
  DollarSign,
  Bell,
  Settings,
} from 'lucide-react';
import styles from './BottomNavigation.module.css';
import { useState } from 'react';

interface BottomNavigationProps {
  user?: {
    role?: string | null;
  };
  unreadNotifications?: number;
}

const BottomNavigation = ({ user, unreadNotifications = 0 }: BottomNavigationProps) => {
  const pathname = usePathname();
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  const primaryNav = [
    { name: 'Today', href: '/pulse', icon: Activity },
    { name: 'Briefs', href: '/briefs', icon: FileText },
  ];

  const secondaryNav = [
    { name: 'Court', href: '/calendar', icon: Gavel },
  ];

  const moreNav = [
    { name: 'Finance', href: '/finance', icon: DollarSign },
    { name: 'Clients', href: '/management/clients', icon: Users },
    { name: 'Email Inbox', href: '/emails', icon: Inbox },
    { name: 'Compliance', href: '/management/compliance', icon: ShieldCheck },
    { name: 'Analytics', href: '/analytics', icon: BarChart2 },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Settings', href: '/settings', icon: Settings },
    ...(isAdminOrOwner ? [{ name: 'IT Mgmt', href: '/management/it', icon: Terminal }] : []),
  ];

  const isActive = (path: string) => {
    if (path === '/management') return pathname === path;
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isMoreActive = moreNav.some(item => isActive(item.href));

  const closeBoth = () => {
    setShowFabMenu(false);
    setShowMoreDrawer(false);
  };

  return (
    <>
      {/* FAB quick-action menu */}
      {showFabMenu && (
        <div className={styles.fabMenuOverlay} onClick={closeBoth}>
          <div className={styles.fabMenuItems} onClick={e => e.stopPropagation()}>
            <Link href="/briefs" onClick={closeBoth} className={styles.fabMenuItem}>
              <FileText size={18} /> New Brief
            </Link>
            <Link href="/calendar" onClick={closeBoth} className={styles.fabMenuItem}>
              <Gavel size={18} /> New Meeting
            </Link>
          </div>
        </div>
      )}

      {/* More modules drawer */}
      {showMoreDrawer && (
        <div className={styles.drawerOverlay} onClick={closeBoth}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHandle} />
            <p className={styles.drawerTitle}>More modules</p>
            <div className={styles.drawerGrid}>
              {moreNav.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.drawerItem} ${isActive(item.href) ? styles.drawerItemActive : ''}`}
                  onClick={closeBoth}
                >
                  <item.icon size={24} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.bottomNav}>
        <div className={styles.navItemsContainer}>
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
            >
              <item.icon size={22} className={styles.icon} />
              <span className={styles.label}>{item.name}</span>
            </Link>
          ))}

          {/* Center FAB */}
          <div className={styles.fabContainer}>
            <button
              className={`${styles.fabButton} ${showFabMenu ? styles.fabActive : ''}`}
              onClick={() => { setShowFabMenu(v => !v); setShowMoreDrawer(false); }}
            >
              <Plus size={24} />
            </button>
          </div>

          {secondaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
            >
              <item.icon size={22} className={styles.icon} />
              <span className={styles.label}>{item.name}</span>
            </Link>
          ))}

          <button
            className={`${styles.navItem} ${styles.moreButton} ${isMoreActive ? styles.active : ''}`}
            onClick={() => { setShowMoreDrawer(v => !v); setShowFabMenu(false); }}
          >
            <LayoutGrid size={22} className={styles.icon} />
            <span className={styles.label}>More</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default BottomNavigation;
