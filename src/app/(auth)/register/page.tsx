'use client';

import { UserPlus, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../auth.module.css';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
    return (
        <div className={styles.authContainer}>
            {/* Branding Side */}
            <div className={styles.brandingSide}>
                <div className={styles.logo}>
                    <Image
                        src="/logo.png"
                        alt="Reforma Logo"
                        width={40}
                        height={40}
                        className={styles.logoImage}
                    />
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
                            <UserPlus className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Invite Your Team</h3>
                                <p>Add team members and assign roles easily</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <Shield className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Secure & Private</h3>
                                <p>Your firm's data is protected and encrypted</p>
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
                            Already have an account? <Link href="/login">Sign in</Link>
                        </p>
                    </div>

                    <RegisterForm />
                </div>
            </div>
        </div>
    );
}

