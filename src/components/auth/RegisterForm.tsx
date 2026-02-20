
'use client';

import { useActionState, useState } from 'react';
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

export default function RegisterForm({ inviteToken, firmName, isPilot }: { inviteToken?: string, firmName?: string, isPilot?: boolean }) {
    // Dynamically choose action
    const action = inviteToken ? registerMember : register;
    const [errorMessage, dispatch, isPending] = useActionState(action, undefined);

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    const isSubmitDisabled = isPending || !termsAccepted || !privacyAccepted;

    return (
        <form action={dispatch} className={styles.form}>
            {/* Hidden Input for Token or Pilot Bypass */}
            {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}
            {isPilot && <input type="hidden" name="isPilot" value="true" />}

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
                    disabled={isPending}
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
                    disabled={isPending}
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
                    disabled={isPending}
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
                            disabled={isPending}
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
                            disabled={isPending}
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
                    disabled={isPending}
                />
                <p className={styles.hint}>Minimum 8 characters</p>
            </div>

            <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        disabled={isPending}
                    />
                    <span>
                        I agree to the <a href="https://drive.google.com/file/d/1ibO2JLwop6qYr4EyS_WTYVVLspzTS2VV/view?usp=sharing" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                    </span>
                </label>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        disabled={isPending}
                    />
                    <span>
                        I have read the <a href="https://drive.google.com/file/d/18ss3O0Htm_mOEtRDIT9vI0w5xQDECTfV/view?usp=drive_link" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                    </span>
                </label>
            </div>

            {errorMessage && (
                <div className={styles.error}>
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitDisabled}
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
        </form>
    );
}
