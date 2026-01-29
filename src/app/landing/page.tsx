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
    CheckCircle2
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
                    <div className={styles.logo}>
                        <Image
                            src="/images/logo-reforma.png"
                            alt="Reforma Logo"
                            width={140}
                            height={35}
                            className={styles.logoImage}
                            priority
                        />
                    </div>
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
                    <div className={styles.gradientOrb1}></div>
                    <div className={styles.gradientOrb2}></div>
                </div>
                <div className={styles.heroContent}>
                    <div className={`${styles.badge} ${styles.animateFadeInUp}`}>
                        <Sparkles size={14} />
                        <span>Reimagining Law for the Global Era</span>
                    </div>
                    <h1 className={`${styles.heroTitle} ${styles.animateFadeInUp} ${styles.delay1}`}>
                        The Operating System for
                        <span className={styles.gradient}> Elite Modern Law</span>
                    </h1>
                    <p className={`${styles.heroDescription} ${styles.animateFadeInUp} ${styles.delay2}`}>
                        Reforma is a high-performance orchestration layer built for global law firms.
                        Unify your litigation, briefs, and client intelligence into a single,
                        enterprise-grade platform designed for US, UK, and African markets.
                    </p>
                    <div className={`${styles.heroCTA} ${styles.animateFadeInUp} ${styles.delay3}`}>
                        <button onClick={scrollToWaitlist} className={styles.btnHero}>
                            Request Early Access
                            <ArrowRight size={20} />
                        </button>
                        <Link href="/login" className={styles.btnSecondary} style={{ padding: '1.25rem 3rem', borderRadius: '3rem' }}>
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className={styles.features}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Built for Precision. <br />Engineered for Growth.</h2>
                        <p className={styles.sectionDescription}>
                            Sophisticated infrastructure for firms that refuse to compromise on technical excellence and operational speed.
                        </p>
                    </div>

                    <div className={styles.featuresGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <FileText />
                            </div>
                            <div>
                                <h3 className={styles.featureTitle}>Brief Intelligence</h3>
                                <p className={styles.featureDescription}>
                                    Semantic search and intelligent categorization for your entire legal library.
                                    Institutional knowledge, accessible in milliseconds.
                                </p>
                            </div>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Calendar />
                            </div>
                            <div>
                                <h3 className={styles.featureTitle}>Global Litigation Tracker</h3>
                                <p className={styles.featureDescription}>
                                    Cross-border matter management with automated jurisdictional rule-tracking
                                    and smart deadline prioritization.
                                </p>
                            </div>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Shield />
                            </div>
                            <div>
                                <h3 className={styles.featureTitle}>Enterprise Governance</h3>
                                <p className={styles.featureDescription}>
                                    Bank-grade encryption and granular role-based access control.
                                    Compliant with global data protection standards (GDPR, NDPR).
                                </p>
                            </div>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <BarChart3 />
                            </div>
                            <div>
                                <h3 className={styles.featureTitle}>Performance Analytics</h3>
                                <p className={styles.featureDescription}>
                                    Real-time visibility into firm utilization, revenue realization,
                                    and case profitability through interactive dashboards.
                                </p>
                            </div>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Users />
                            </div>
                            <div>
                                <h3 className={styles.featureTitle}>Synchronized Teams</h3>
                                <p className={styles.featureDescription}>
                                    Real-time collaboration for distributed legal teams.
                                    Work move-by-move with absolute clarity and accountability.
                                </p>
                            </div>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Zap />
                            </div>
                            <div>
                                <h3 className={styles.featureTitle}>Automation Engine</h3>
                                <p className={styles.featureDescription}>
                                    Eliminate billable leakage and administrative drag with
                                    intelligent workflows that handle the routine so you can lead.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Waitlist Section */}
            <section ref={waitlistRef} className={styles.waitlistSection}>
                <div className={styles.waitlistContainer}>
                    <h2 className={styles.sectionTitle} style={{ textAlign: 'center' }}>Secure Your Future</h2>
                    <p className={styles.sectionDescription}>
                        We are currently onboarding a select group of elite law firms in the US, UK, and South Africa.
                        Join the waitlist to be part of the next cohort.
                    </p>

                    {submitStatus === 'success' ? (
                        <div style={{ marginTop: '3rem', padding: '3rem', background: 'white', borderRadius: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
                            <CheckCircle2 color="#14B8A6" size={48} style={{ margin: '0 auto 1.5rem' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>You're on the list!</h3>
                            <p color="#6B7280">{message}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={styles.waitlistForm}>
                            <div className={styles.inputGroup}>
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="Professional Email Address"
                                    required
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <input
                                    name="firmName"
                                    type="text"
                                    placeholder="Firm Name"
                                    required
                                    className={styles.input}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={styles.submitBtn}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Join the Global Waitlist'}
                            </button>
                            {submitStatus === 'error' && (
                                <p style={{ color: '#DC2626', marginTop: '1rem' }}>{message}</p>
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
                            className={styles.logoImage}
                        />
                        <p className={styles.footerTagline}>
                            High-Performance Legal Infrastructure
                        </p>
                    </div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                        © {new Date().getFullYear()} Reforma OS. Built for Global Excellence.
                    </div>
                </div>
            </footer>
        </div>
    );
}
