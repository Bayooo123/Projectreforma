'use client';

import { useActionState, useState } from 'react';
import { validateFirmCredentials, registerMember } from '@/app/actions/firm-auth';
import { Loader2, Scale, Users, UserPlus, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';
import styles from '../auth.module.css';

const LAWYER_ROLES = [
    'Senior Partner',
    'Partner',
    'Senior Associate',
    'Associate',
    'Junior Associate',
    'Pupil',
];

const STAFF_ROLES = [
    'Paralegal',
    'Legal Secretary',
    'Accountant',
    'Office Manager',
    'IT Support',
    'Clerk',
    'Other'
];

export default function JoinPage() {
    const [step, setStep] = useState<'verify' | 'register'>('verify');
    const [firmData, setFirmData] = useState<{ id: string; name: string } | null>(null);

    // Action states
    const [customError, setCustomError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    async function handleVerify(formData: FormData) {
        setIsPending(true);
        setCustomError(null);

        try {
            // We use the action directly here instead of useActionState for the first step
            // because we need to conditionally change local state (step) based on result
            // @ts-ignore
            const result = await validateFirmCredentials({}, formData);

            if (result.errors) {
                setCustomError(result.errors._form?.[0] || 'Invalid credentials');
            } else if (result.success && result.firmId) {
                setFirmData({ id: result.firmId, name: result.firmName || 'Firm' });
                setStep('register');
            }
        } catch (err) {
            setCustomError('Something went wrong. Please try again.');
        } finally {
            setIsPending(false);
        }
    }

    const [registerState, registerDispatch, isRegisterPending] = useActionState(registerMember, {});

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
                        Join your team<br />on Reforma
                    </h1>
                    <p className={styles.brandingDescription}>
                        Connect with your firm's workspace to access cases, documents,
                        and collaborate with your colleagues in real-time.
                    </p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <Building2 className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Unified Workspace</h3>
                                <p>Access shared firm resources instantly</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <UserPlus className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Quick Onboarding</h3>
                                <p>Get set up and ready to work in minutes</p>
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
                        <h2 className={styles.formTitle}>
                            {step === 'verify' ? 'Find your firm' : `Join ${firmData?.name}`}
                        </h2>
                        <p className={styles.formSubtitle}>
                            {step === 'verify' ? (
                                <>
                                    Need to create a new firm? <Link href="/register">Get started</Link>
                                    <span className={styles.divider}> · </span>
                                    Already a member? <Link href="/login">Sign in</Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => setStep('verify')}
                                    className={styles.backLink}
                                    type="button"
                                >
                                    Select a different firm
                                </button>
                            )}
                        </p>
                    </div>

                    {step === 'verify' ? (
                        <form action={handleVerify} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="firmCode" className={styles.label}>
                                    Firm Code
                                </label>
                                <input
                                    id="firmCode"
                                    name="firmCode"
                                    type="text"
                                    required
                                    className={styles.input}
                                    placeholder="e.g. DOE-LAW-001"
                                />
                                <p className={styles.hint}>
                                    Ask your administrator for your firm's unique code
                                </p>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="firmPassword" className={styles.label}>
                                    Firm Join Password
                                </label>
                                <input
                                    id="firmPassword"
                                    name="firmPassword"
                                    type="password"
                                    required
                                    className={styles.input}
                                    placeholder="Enter firm password"
                                />
                            </div>

                            {customError && (
                                <div className={styles.error}>
                                    {customError}
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
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Continue
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form action={registerDispatch} className={styles.form}>
                            <input type="hidden" name="firmId" value={firmData?.id} />

                            <div className={styles.formGroup}>
                                <label htmlFor="name" className={styles.label}>
                                    Full Name
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
                                    Work Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className={styles.input}
                                    placeholder="john@lawfirm.com"
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
                                    className={styles.input}
                                    placeholder="+234 800 000 0000"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="designation" className={styles.label}>
                                    Role / Designation
                                </label>
                                <input
                                    id="designation"
                                    name="designation"
                                    type="text"
                                    required
                                    list="roles"
                                    className={styles.input}
                                    placeholder="e.g. Associate"
                                />
                                <datalist id="roles">
                                    {LAWYER_ROLES.map(role => (
                                        <option key={role} value={role} />
                                    ))}
                                    {STAFF_ROLES.map(role => (
                                        <option key={role} value={role} />
                                    ))}
                                </datalist>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="password" className={styles.label}>
                                    Create Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    className={styles.input}
                                    placeholder="Min. 8 characters"
                                />
                            </div>

                            {registerState?.errors?._form && (
                                <div className={styles.error}>
                                    {registerState.errors._form[0]}
                                </div>
                            )}

                            {registerState?.success ? (
                                <div className={styles.successMessage}>
                                    <p>Account created successfully!</p>
                                    <Link href="/login" className={styles.buttonLink}>
                                        Sign In to Continue
                                    </Link>
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isRegisterPending}
                                    className={styles.submitButton}
                                >
                                    {isRegisterPending ? (
                                        <>
                                            <Loader2 className={styles.spinner} size={20} />
                                            Creating Account...
                                        </>
                                    ) : (
                                        'Join Firm'
                                    )}
                                </button>
                            )}

                            <p className={styles.terms}>
                                Note: Your account will need approval from a firm administrator before you can access the workspace.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
