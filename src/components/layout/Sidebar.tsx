"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Gavel,
  Users,
  Briefcase,
  BarChart2,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { signOut } from 'next-auth/react'; // Use client-side signOut
import { useEffect } from 'react';
import { checkOverdueInvoices } from '@/app/actions/notifications';

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isPlatformAdmin?: boolean;
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
    // Check for invoice follow-ups on mount (once per session/refresh)
    const runChecks = async () => {
      try {
        await checkOverdueInvoices();
      } catch (e) {
        console.error(e);
      }
    };
    runChecks();
  }, []);

  const navItems = [
    { name: 'Briefs Manager', href: '/briefs', icon: FileText },
    { name: 'Litigation', href: '/calendar', icon: Gavel },
    { name: 'Client Management', href: '/management/clients', icon: Users },
    { name: 'Office Manager', href: '/management/office', icon: Briefcase },
    { name: 'Compliance', href: '/management/compliance', icon: ShieldCheck },
    { name: 'Analytics', href: '/analytics', icon: BarChart2 },
  ];

  const isActive = (path: string) => {
    // Strict match for the root Overview page to prevent it from being active on sub-pages
    if (path === '/management') {
      return pathname === path;
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <h1 className={styles.logo}>Reforma</h1>

        <div className={styles.firmBranding}>
          {workspace?.letterheadUrl && workspace.letterheadUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
            <img
              src={workspace.letterheadUrl}
              alt={workspace.name}
              className={styles.firmLogo}
            />
          ) : (
            <span className={styles.firmName}>{workspace?.name || 'Loading firm...'}</span>
          )}
        </div>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
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
      </nav>

      <div className={styles.footer}>
        {user?.isPlatformAdmin && (
          <Link href="/admin" className={styles.footerLink} style={{ color: '#38bdf8' }}>
            <ShieldAlert size={20} className={styles.navIcon} />
            <span className={styles.navText}>Platform Admin</span>
          </Link>
        )}

        <Link href="#" className={styles.footerLink} onClick={(e) => e.preventDefault()}>
          <HelpCircle size={20} className={styles.navIcon} />
          <span className={styles.navText}>Help</span>
        </Link>

        <button
          className={styles.footerLink}
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut size={20} className={styles.navIcon} />
          <span className={styles.navText}>Log out</span>
        </button>

        {user && (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user.name?.[0] || 'U'}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name || 'User'}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
