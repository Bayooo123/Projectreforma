"use client";

import { useState, useTransition } from 'react';
import { Shield, Mail, Calendar, UserMinus, X, Loader, Clock } from 'lucide-react';
import { invitePlatformAdmin, removePlatformAdmin, revokeAdminInvite } from '@/app/actions/admin-team';
import { useRouter } from 'next/navigation';
import styles from './Team.module.css';

interface Admin {
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
}

interface PendingInvite {
    id: string;
    email: string;
    createdAt: Date;
    expiresAt: Date;
    invitedBy: { name: string | null };
}

interface Props {
    admins: Admin[];
    pendingInvites: PendingInvite[];
}

export default function TeamClient({ admins, pendingInvites }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [inviting, setInviting] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess('');
        setInviting(true);
        try {
            const result = await invitePlatformAdmin(inviteEmail.trim());
            if (result.success) {
                setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
                setInviteEmail('');
                router.refresh();
            } else {
                setInviteError(result.error || 'Failed to send invitation.');
            }
        } catch {
            setInviteError('Something went wrong.');
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = (userId: string) => {
        startTransition(async () => {
            await removePlatformAdmin(userId);
            router.refresh();
        });
    };

    const handleRevoke = (inviteId: string) => {
        startTransition(async () => {
            await revokeAdminInvite(inviteId);
            router.refresh();
        });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>HQ Team</h1>
                    <p className={styles.subtitle}>Manage platform administrators and send invitations</p>
                </div>
            </header>

            {/* Invite form */}
            <div className={styles.inviteCard}>
                <h2 className={styles.sectionTitle}>Invite a team member</h2>
                <p className={styles.sectionDesc}>
                    The invited person will receive an email with a link to create their platform admin account.
                </p>
                <form onSubmit={handleInvite} className={styles.inviteForm}>
                    <input
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        required
                        className={styles.emailInput}
                        disabled={inviting}
                    />
                    <button type="submit" className={styles.inviteBtn} disabled={inviting}>
                        {inviting ? <Loader size={16} className={styles.spin} /> : <Mail size={16} />}
                        {inviting ? 'Sending...' : 'Send Invitation'}
                    </button>
                </form>
                {inviteError && <p className={styles.errorMsg}>{inviteError}</p>}
                {inviteSuccess && <p className={styles.successMsg}>{inviteSuccess}</p>}
            </div>

            {/* Current admins */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    <Shield size={18} className={styles.sectionIcon} />
                    Platform Admins ({admins.length})
                </h2>
                <div className={styles.table}>
                    {admins.length === 0 ? (
                        <div className={styles.empty}>No admins found.</div>
                    ) : (
                        admins.map(admin => (
                            <div key={admin.id} className={styles.row}>
                                <div className={styles.avatar}>{(admin.name || admin.email)[0].toUpperCase()}</div>
                                <div className={styles.rowInfo}>
                                    <span className={styles.rowName}>{admin.name || '—'}</span>
                                    <span className={styles.rowEmail}>{admin.email}</span>
                                </div>
                                <div className={styles.rowMeta}>
                                    <Calendar size={13} />
                                    <span>Since {new Date(admin.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => handleRemove(admin.id)}
                                    disabled={isPending}
                                    title="Remove admin access"
                                >
                                    <UserMinus size={15} />
                                    Remove
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Clock size={18} className={styles.sectionIcon} />
                        Pending Invitations ({pendingInvites.length})
                    </h2>
                    <div className={styles.table}>
                        {pendingInvites.map(invite => (
                            <div key={invite.id} className={`${styles.row} ${styles.pendingRow}`}>
                                <div className={`${styles.avatar} ${styles.pendingAvatar}`}>{invite.email[0].toUpperCase()}</div>
                                <div className={styles.rowInfo}>
                                    <span className={styles.rowName}>{invite.email}</span>
                                    <span className={styles.rowEmail}>Invited by {invite.invitedBy.name || 'Unknown'}</span>
                                </div>
                                <div className={styles.rowMeta}>
                                    <Clock size={13} />
                                    <span>Expires {new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <button
                                    className={styles.revokeBtn}
                                    onClick={() => handleRevoke(invite.id)}
                                    disabled={isPending}
                                    title="Revoke invitation"
                                >
                                    <X size={15} />
                                    Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
