'use client';

import {
    Scale,
    FileText,
    Calendar,
    Users,
    BarChart3,
    Shield,
    ArrowRight,
    Sparkles,
    Globe,
    Lock,
    Zap,
    ChevronRight,
    Loader2,
    CheckCircle2,
    Briefcase,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './landing.module.css';
import { useEffect, useState, useRef } from 'react';
import { joinWaitlist } from '../actions/waitlist';

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const waitlistRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToWaitlist = () => {
        waitlistRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        const formData = new FormData(event.currentTarget);
        const result = await joinWaitlist(formData);

        setIsSubmitting(false);
        if (result.success) {
            setSubmitStatus('success');
            setMessage(result.message || '');
            (event.target as HTMLFormElement).reset();
        } else {
            setSubmitStatus('error');
            setMessage('Something went wrong. Please try again.');
        }
    }

    return (
        <div className={styles.landingPage}>
            {/* Navigation */}
            <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
                <div className={styles.navContainer}>
                    <div className={styles.navActions}>
                        <Link href="/login" className={styles.btnSecondary}>
                            Login
                        </Link>
                        <button onClick={scrollToWaitlist} className={styles.btnPrimary}>
                            Join Waitlist
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroBackground}>
                    <div className={styles.gridPattern}></div>
                </div>
                <div className={styles.heroContent}>
                    <div className={styles.heroLogoContainer}>
                        <Image
                            src="/images/logo-reforma.png"
                            alt="Reforma Logo"
                            width={180}
                            height={45}
                            className={styles.heroLogo}
                            priority
                        />
                    </div>

                    <h1 className={styles.heroTitle}>
                        The Operating System for <br />
                        <span style={{ color: 'var(--primary-color)' }}>All Law Firms</span>
                    </h1>

                    <p className={styles.heroDescription}>
                        Reforma is a modular legal operations platform built for Nigerian law firms.
                        It brings together briefs management, intelligence sharing, financial tracking,
                        invoice generation, and business analytics into a single, secure system
                        designed to support modern Nigerian legal practice.
                    </p>

                    <div className={styles.heroCTA}>
                        <button onClick={scrollToWaitlist} className={styles.btnHero}>
                            Request Early Access
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className={styles.features}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Built for Nigerian Legal Excellence</h2>
                        <p className={styles.sectionDescription}>
                            A comprehensive infrastructure layer that automates the routine and illuminates the performance of your firm.
                        </p>
                    </div>

                    <div className={styles.featuresGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <FileText />
                            </div>
                            <h3 className={styles.featureTitle}>Briefs Management</h3>
                            <p className={styles.featureDescription}>
                                Centralize and secure your firm's entire document history.
                                Search through years of litigation and advisory work in seconds.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <TrendingUp />
                            </div>
                            <h3 className={styles.featureTitle}>Financial Tracking</h3>
                            <p className={styles.featureDescription}>
                                Real-time visibility into billables and expenses.
                                Monitor your firm's financial health with absolute precision and clarity.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Zap />
                            </div>
                            <h3 className={styles.featureTitle}>Automated Invoicing</h3>
                            <p className={styles.featureDescription}>
                                Generate professional, compliant invoices in clicks.
                                Reduce administrative overhead and accelerate your billing cycles.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <BarChart3 />
                            </div>
                            <h3 className={styles.featureTitle}>Business Analytics</h3>
                            <p className={styles.featureDescription}>
                                Transform operations into data. Gain insights into lawyer productivity,
                                client value, and matter profitability.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Users />
                            </div>
                            <h3 className={styles.featureTitle}>Team Intelligence</h3>
                            <p className={styles.featureDescription}>
                                Break down silos. Share institutional knowledge across the firm
                                while maintaining strict role-based access controls.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <ShieldCheck />
                            </div>
                            <h3 className={styles.featureTitle}>Secure Infrastructure</h3>
                            <p className={styles.featureDescription}>
                                Enterprise-grade security for your most sensitive data.
                                Redundant backups and high-availability systems you can lean on.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Waitlist Section */}
            <section ref={waitlistRef} className={styles.waitlistSection}>
                <div className={styles.waitlistContainer}>
                    <h2 className={styles.sectionTitle}>System Availability</h2>
                    <p className={styles.sectionDescription}>
                        We are currently onboarding Nigerian law firms through a curated waitlist.
                        Secure your position to modernize your practice.
                    </p>

                    {submitStatus === 'success' ? (
                        <div style={{ marginTop: '3rem', padding: '3rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid var(--primary-color)' }}>
                            <CheckCircle2 color="#14B8A6" size={48} style={{ margin: '0 auto 1.5rem' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Application Received</h3>
                            <p style={{ color: '#94a3b8' }}>{message}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={styles.waitlistForm}>
                            <input
                                name="email"
                                type="email"
                                placeholder="Managing Partner / Professional Email"
                                required
                                className={styles.input}
                            />
                            <input
                                name="firmName"
                                type="text"
                                placeholder="Name of Law Firm"
                                required
                                className={styles.input}
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={styles.submitBtn}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Join the Waitlist'}
                            </button>
                            {submitStatus === 'error' && (
                                <p style={{ color: '#ef4444', marginTop: '1.5rem' }}>{message}</p>
                            )}
                        </form>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <Image
                            src="/images/logo-reforma.png"
                            alt="Reforma Logo"
                            width={120}
                            height={30}
                            className={styles.heroLogo}
                            style={{ margin: 0 }}
                        />
                        <p className={styles.footerTagline} style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            Serious Infrastructure for Nigerian Law.
                        </p>
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.875rem' }}>
                        © {new Date().getFullYear()} Reforma. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
