"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { signOut } from 'next-auth/react'; // Use client-side signOut
import { useEffect } from 'react';
import { checkOverdueInvoices } from '@/app/actions/notifications';
import { navigationGroups, todayItem } from '@/config/navigation';

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isPlatformAdmin?: boolean;
    role?: string | null;
  };
  workspace?: {
    id: string;
    name: string;
    letterheadUrl?: string | null;
  } | null;
}

const Sidebar = ({ user, workspace }: SidebarProps) => {
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await checkOverdueInvoices();
      } catch (e) {
        console.error(e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  const isActive = (path: string) => {
    // Exact or starting with (to handle query params/subroutes)
    const cleanPath = path.split('?')[0];
    if (cleanPath === '/management') {
      return pathname === cleanPath;
    }
    return pathname === cleanPath || pathname.startsWith(cleanPath + '/');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <h1 className={styles.logo}>Reforma</h1>
        {workspace?.letterheadUrl && workspace.letterheadUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) && (
          <div className={styles.firmBranding}>
            <img
              src={workspace.letterheadUrl}
              alt={workspace.name}
              className={styles.firmLogo}
            />
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          <li key={todayItem.name}>
            <Link
              href={todayItem.href}
              prefetch={true}
              className={`${styles.navLink} ${isActive(todayItem.href) ? styles.active : ''}`}
            >
              <todayItem.icon size={20} className={styles.navIcon} />
              <span className={styles.navText}>{todayItem.name}</span>
            </Link>
          </li>

          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.adminOnly) {
                return isAdminOrOwner || user?.isPlatformAdmin;
              }
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <li key={group.label} className={styles.navGroupSection}>
                <div className={styles.sectionHeader}>{group.label}</div>
                <ul className={styles.navList} style={{ gap: '2px' }}>
                  {visibleItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        prefetch={true}
                        className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
                      >
                        <item.icon size={20} className={styles.navIcon} />
                        <span className={styles.navText}>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        {user?.isPlatformAdmin && (
          <Link href="/admin" className={styles.footerLink} style={{ color: '#38bdf8' }}>
            <ShieldAlert size={20} className={styles.navIcon} />
            <span className={styles.navText}>Platform Admin</span>
          </Link>
        )}

        <button
          className={styles.footerLink}
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut size={20} className={styles.navIcon} />
          <span className={styles.navText}>Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
