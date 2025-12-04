'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Loader2, CheckCircle, XCircle, Building2 } from 'lucide-react';
import styles from './invite.module.css';

interface InvitationPageProps {
    params: Promise<{ token: string }>;
}

interface InvitationDetails {
    workspace: {
        name: string;
    };
    email: string;
    role: string;
    inviter: {
        name: string;
    };
    expiresAt: string;
}

export default function InvitationPage({ params }: InvitationPageProps) {
    const router = useRouter();
    const [token, setToken] = useState<string>('');
    const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        params.then(p => {
            setToken(p.token);
            fetchInvitation(p.token);
        });
    }, [params]);

    const fetchInvitation = async (inviteToken: string) => {
        try {
            const response = await fetch(`/api/invitations/${inviteToken}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Invalid invitation');
            }

            const data = await response.json();
            setInvitation(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        if (!name || !password) {
            setError('Please fill in all fields');
            setSubmitting(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    name,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to accept invitation');
            }

            setSuccess(true);

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                router.push(`/login?email=${encodeURIComponent(data.email)}`);
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to accept invitation');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingCard}>
                    <Loader2 className={styles.spinner} size={40} />
                    <p>Loading invitation...</p>
                </div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className={styles.container}>
                <div className={styles.errorCard}>
                    <XCircle size={48} className={styles.errorIcon} />
                    <h1>Invalid Invitation</h1>
                    <p>{error}</p>
                    <button onClick={() => router.push('/login')} className={styles.button}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.successCard}>
                    <CheckCircle size={48} className={styles.successIcon} />
                    <h1>Welcome aboard!</h1>
                    <p>You've successfully joined {invitation?.workspace.name}</p>
                    <p className={styles.redirectText}>Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <Scale size={32} />
                        <span>Reforma</span>
                    </div>
                </div>

                <div className={styles.invitationInfo}>
                    <div className={styles.workspaceIcon}>
                        <Building2 size={32} />
                    </div>
                    <h1 className={styles.title}>You've been invited!</h1>
                    <p className={styles.description}>
                        <strong>{invitation?.inviter.name}</strong> has invited you to join{' '}
                        <strong>{invitation?.workspace.name}</strong> as a{' '}
                        <strong>{invitation?.role}</strong>.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={invitation?.email || ''}
                            disabled
                            className={`${styles.input} ${styles.inputDisabled}`}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>
                            Your Full Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Create Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            className={styles.input}
                        />
                        <p className={styles.hint}>Minimum 8 characters</p>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className={styles.submitButton}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className={styles.spinner} size={20} />
                                Joining workspace...
                            </>
                        ) : (
                            'Accept Invitation & Join'
                        )}
                    </button>

                    <p className={styles.footer}>
                        Already have an account?{' '}
                        <a href="/login" className={styles.link}>
                            Sign in
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
