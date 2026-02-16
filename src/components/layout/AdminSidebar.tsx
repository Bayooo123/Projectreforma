"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Building2,
    Clock,
    Settings,
    HelpCircle,
    LogOut,
    AppWindow
} from 'lucide-react';
import styles from './AdminSidebar.module.css';
import { signOut } from 'next-auth/react';

interface AdminSidebarProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

const AdminSidebar = ({ user }: AdminSidebarProps) => {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Waitlist', href: '/admin/waitlist', icon: Clock },
        { name: 'Workspaces', href: '/admin/workspaces', icon: Building2 },
        { name: 'Users', href: '/admin/users', icon: Users },
    ];

    const isActive = (path: string) => {
        if (path === '/admin') {
            return pathname === path;
        }
        return pathname.startsWith(path);
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <h1 className={styles.logo}>Reforma</h1>
                <span className={styles.logoSub}>HQ Administration</span>
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
                <Link href="/briefs" className={styles.footerLink}>
                    <AppWindow size={20} className={styles.navIcon} />
                    <span className={styles.navText}>Back to App</span>
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
                            {user.name?.[0] || 'A'}
                        </div>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{user.name || 'Admin'}</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default AdminSidebar;
