"use client";

import { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import NotificationPopover from './NotificationPopover';
import UserProfileMenu from './UserProfileMenu';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getUserNotifications } from '@/app/actions/notifications';
import styles from './Header.module.css';

interface HeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
    workspace?: {
        id: string;
        name: string;
        role: string;
        isOwner: boolean;
    } | null;
}

const Header = ({ user, workspace }: HeaderProps) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Use standard server action call
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await getUserNotifications(1); // Limit 1 just to get count
                if (res.success) setUnreadCount(res.unreadCount || 0);
            } catch (e) {
                console.error(e);
            }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 60000);
        return () => clearInterval(interval);
    }, []);

    // Get workspace initials
    const getWorkspaceInitials = (name?: string) => {
        if (!name) return 'WS';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header className={styles.header}>
            <div className={styles.leftSection}>
                <div className={styles.workspace}>
                    <div className={styles.workspaceAvatar}>
                        {getWorkspaceInitials(workspace?.name)}
                    </div>
                    <span className={styles.workspaceName}>
                        {workspace?.name || 'My Workspace'}
                    </span>
                    <ChevronDown size={14} className={styles.chevron} />
                </div>
            </div>

            <div className={styles.searchContainer}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search for anything..."
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.rightSection}>
                <ThemeToggle />
                <div className={styles.notificationWrapper}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                    </button>
                    {showNotifications && <NotificationPopover />}
                </div>

                {user && (
                    <UserProfileMenu user={user} workspace={workspace} />
                )}
            </div>
        </header>
    );
};

export default Header;
