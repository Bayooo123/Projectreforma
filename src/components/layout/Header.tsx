"use client";

import { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import NotificationPopover from './NotificationPopover';
import styles from './Header.module.css';

const Header = () => {
    const [showNotifications, setShowNotifications] = useState(false);

    return (
        <header className={styles.header}>
            <div className={styles.leftSection}>
                <div className={styles.workspace}>
                    <div className={styles.workspaceAvatar}>AL</div>
                    <span className={styles.workspaceName}>ASCO LP</span>
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
                    <div className={styles.avatar}>KO</div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>Kemi O.</span>
                        <span className={styles.userRole}>Senior Partner</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
