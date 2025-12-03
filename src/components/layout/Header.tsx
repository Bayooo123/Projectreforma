"use client";

import { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import NotificationPopover from './NotificationPopover';
import styles from './Header.module.css';

interface HeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
    };
    workspace?: {
        name?: string;
    };
}

const Header = ({ user, workspace }: HeaderProps) => {
    const [showNotifications, setShowNotifications] = useState(false);

    // Get initials from name
    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

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
                <div className={styles.notificationWrapper}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        <span className={styles.badge}>3</span>
                    </button>
                    {showNotifications && <NotificationPopover />}
                </div>

                <div className={styles.profile}>
                    <div className={styles.avatar}>
                        {getInitials(user?.name)}
                    </div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>
                            {user?.name || 'User'}
                        </span>
                        <span className={styles.userRole}>
                            {user?.email || ''}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
