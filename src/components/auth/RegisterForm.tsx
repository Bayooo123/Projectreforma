
'use client';

import { useActionState } from 'react';
import { register, registerMember } from '@/app/lib/actions';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import styles from '@/app/(auth)/auth.module.css';

const ADMIN_ROLES = [
    'Practice Manager',
    'Head of Chambers',
    'Deputy Head of Chambers',
    'Managing Partner',
    'Senior Associate',
    'Associate',
    'Managing Associate',
];

export default function RegisterForm({ inviteToken, firmName }: { inviteToken?: string, firmName?: string }) {
    // Dynamically choose action
    const action = inviteToken ? registerMember : register;
    const [errorMessage, dispatch, isPending] = useActionState(action, undefined);

    return (
        <form action={dispatch} className={styles.form}>
            {/* Hidden Input for Token */}
            {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}

            <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>
                    Your Full Name
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className={styles.input}
                    placeholder="John Doe"
                />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                    Email Address
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={styles.input}
                    placeholder="you@lawfirm.com"
                />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.label}>
                    Phone Number
                </label>
                <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    className={styles.input}
                    placeholder="+234 800 000 0000"
                />
            </div>

            {/* FIRM DETAILS - Only show if creating a new firm (no token) */}
            {!inviteToken && (
                <>
                    <div className={styles.formGroup}>
                        <label htmlFor="firmName" className={styles.label}>
                            Law Firm Name
                        </label>
                        <input
                            id="firmName"
                            name="firmName"
                            type="text"
                            required
                            className={styles.input}
                            placeholder="Doe & Associates"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="role" className={styles.label}>
                            Your Role
                        </label>
                        <select
                            id="role"
                            name="role"
                            required
                            className={styles.select}
                        >
                            <option value="">Select your role</option>
                            {ADMIN_ROLES.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                    Password
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={styles.input}
                    placeholder="••••••••"
                />
                <p className={styles.hint}>Minimum 8 characters</p>
            </div>

            {errorMessage && (
                <div className={styles.error}>
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={isPending}
                className={styles.submitButton}
            >
                {isPending ? (
                    <>
                        <Loader2 className={styles.spinner} size={20} />
                        {inviteToken ? 'Joining Firm...' : 'Creating Firm...'}
                    </>
                ) : (
                    inviteToken ? `Join ${firmName || 'Firm'}` : 'Create Firm Account'
                )}
            </button>

            <p className={styles.terms}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
        </form>
    );
}
