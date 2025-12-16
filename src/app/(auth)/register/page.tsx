'use client';

import { useActionState } from 'react';
import { register } from '@/app/lib/actions';
import { Loader2, Scale, Building2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import styles from '../auth.module.css';

const ADMIN_ROLES = [
    'Practice Manager',
    'Head of Chambers',
    'Deputy Head of Chambers',
    'Managing Partner',
    'Senior Associate',
    'Associate',
    'Managing Associate',
];

export default function RegisterPage() {
    const [errorMessage, dispatch, isPending] = useActionState(register, undefined);

    return (
        <div className={styles.authContainer}>
            {/* Branding Side */}
            <div className={styles.brandingSide}>
                <div className={styles.logo}>
                    <Scale className={styles.logoIcon} />
                    <span className={styles.logoText}>Reforma</span>
                </div>

                <div className={styles.brandingContent}>
                    <h1 className={styles.brandingTitle}>
                        Set up your firm<br />in minutes
                    </h1>
                    <p className={styles.brandingDescription}>
                        Join forward-thinking law firms using Reforma to manage cases,
                        collaborate with teams, and deliver exceptional client service.
                    </p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <Building2 className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Multi-Workspace Support</h3>
                                <p>Manage multiple firms from one account</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <UserPlus className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Invite Your Team</h3>
                                <p>Add team members and assign roles easily</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className={styles.copyright}>
                    © 2024 Reforma. All rights reserved.
                </p>
            </div>

            {/* Form Side */}
            <div className={styles.formSide}>
                <div className={styles.formContainer}>
                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>Create your firm</h2>
                        <p className={styles.formSubtitle}>
                            Joining a team? <Link href="/join">Find your firm</Link>
                            <span className={styles.divider}> · </span>
                            Already have an account? <Link href="/login">Sign in</Link>
                        </p>
                    </div>

                    <form action={dispatch} className={styles.form}>
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
                            <label htmlFor="firmCode" className={styles.label}>
                                Firm Code (Unique ID)
                            </label>
                            <input
                                id="firmCode"
                                name="firmCode"
                                type="text"
                                required
                                className={styles.input}
                                placeholder="DOE-LAW-001"
                                minLength={3}
                            />
                            <p className={styles.hint}>
                                This code will be used by your team to join the firm.
                            </p>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="firmPassword" className={styles.label}>
                                Firm Join Password
                            </label>
                            <input
                                id="firmPassword"
                                name="firmPassword"
                                type="text"
                                required
                                className={styles.input}
                                placeholder="SecureFirmPass123"
                                minLength={6}
                            />
                            <p className={styles.hint}>
                                Share this password only with your team members.
                            </p>
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
                            <p className={styles.hint}>
                                Only senior management can set up a firm workspace
                            </p>
                        </div>

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
                                    Creating your firm...
                                </>
                            ) : (
                                'Create Firm Account'
                            )}
                        </button>

                        <p className={styles.terms}>
                            By creating an account, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
