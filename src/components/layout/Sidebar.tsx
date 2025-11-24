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
  LogOut
} from 'lucide-react';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Briefs Manager', href: '/briefs', icon: FileText },
    { name: 'Litigation', href: '/calendar', icon: Gavel },
    { name: 'Client Manager', href: '/management/clients', icon: Users },
    { name: 'Officer Manager', href: '/management/office', icon: Briefcase },
    { name: 'Analytics', href: '/analytics', icon: BarChart2 },

  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <h1 className={styles.logo}>Reforma</h1>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
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
        <Link href="/help" className={styles.footerLink}>
          <HelpCircle size={20} className={styles.navIcon} />
          <span className={styles.navText}>Help</span>
        </Link>
        <button className={styles.footerLink}>
          <LogOut size={20} className={styles.navIcon} />
          <span className={styles.navText}>Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
