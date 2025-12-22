"use client";

import { useState, useRef, useEffect } from 'react';
import { UserCircle, UserPlus, Settings, LogOut, ChevronDown } from 'lucide-react';
import { signOut } from 'next-auth/react';
import InviteTeamModal from '../invitations/InviteTeamModal';
import styles from './UserProfileMenu.module.css';

interface UserProfileMenuProps {
    user: {
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

const UserProfileMenu = ({ user, workspace }: UserProfileMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleInviteClick = () => {
        setIsOpen(false);
        setShowInviteModal(true);
    };

    const handleSignOut = () => {
        signOut({ callbackUrl: '/login' });
    };

    return (
        <>
            <div className={styles.profileMenuContainer} ref={menuRef}>
                <button
                    className={styles.profileButton}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    <div className={styles.avatar}>
                        {user.image ? (
                            <img src={user.image} alt={user.name || 'User'} />
                        ) : (
                            <span>{getInitials(user.name)}</span>
                        )}
                    </div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>
                            {user.name || 'User'}
                        </span>
                        <span className={styles.userRole}>
                            {workspace?.role || 'Member'}
                        </span>
                    </div>
                    <ChevronDown
                        size={16}
                        className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className={styles.dropdown}>
                        <div className={styles.dropdownHeader}>
                            <div className={styles.dropdownUserInfo}>
                                <span className={styles.dropdownUserName}>{user.name}</span>
                                <span className={styles.dropdownUserEmail}>{user.email}</span>
                            </div>
                            {workspace && (
                                <div className={styles.workspaceInfo}>
                                    <span className={styles.workspaceName}>{workspace.name}</span>
                                    <span className={styles.workspaceRole}>{workspace.role}</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.dropdownDivider} />

                        <div className={styles.dropdownMenu}>
                            {workspace?.isOwner && (
                                <button
                                    className={styles.menuItem}
                                    onClick={handleInviteClick}
                                >
                                    <UserPlus size={18} />
                                    <span>Invite Team Members</span>
                                </button>
                            )}

                            <button
                                className={styles.menuItem}
                                onClick={() => window.location.href = '/settings'}
                            >
                                <Settings size={18} />
                                <span>Settings</span>
                            </button>

                            <div className={styles.dropdownDivider} />

                            <button
                                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                onClick={handleSignOut}
                            >
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showInviteModal && workspace && (
                <InviteTeamModal
                    workspaceId={workspace.id}
                    workspaceName={workspace.name}
                    onClose={() => setShowInviteModal(false)}
                />
            )}
        </>
    );
};

export default UserProfileMenu;
