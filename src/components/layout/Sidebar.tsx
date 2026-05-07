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
  LogOut,
  ShieldAlert,
  Terminal
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

  const navItems = [
    { name: 'The Pulse', href: '/pulse', icon: Activity },
    { name: 'Briefs Manager', href: '/briefs', icon: FileText },
    { name: 'Calendar and meetings', href: '/calendar', icon: Gavel },
    { name: 'Client Management', href: '/management/clients', icon: Users },
    { name: 'Office Manager', href: '/management/office', icon: Briefcase },
    { name: 'Compliance', href: '/management/compliance', icon: ShieldCheck },
    { name: 'Analytics', href: '/analytics', icon: BarChart2 },
    ...(isAdminOrOwner ? [{ name: 'IT Management', href: '/management/it', icon: Terminal }] : []),
  ];

  const isActive = (path: string) => {
    if (path === '/management') {
      return pathname === path;
    }
    return pathname === path || pathname.startsWith(path + '/');
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
