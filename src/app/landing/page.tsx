'use client';

import { Scale, FileText, Calendar, Users, BarChart3, Shield, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './landing.module.css';
import { useEffect, useState } from 'react';

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={styles.landingPage}>
            {/* Navigation */}
            <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
                <div className={styles.navContainer}>
                    <div className={styles.logo}>
                        <Image
                            src="/images/logo-reforma.png"
                            alt="Reforma Logo"
                            width={160}
                            height={40}
                            className={styles.logoImage}
                            priority
                        />
                    </div>
                    <div className={styles.navActions}>
                        <Link href="/login" className={styles.btnSecondary}>
                            Login
                        </Link>
                        <Link href="/register" className={styles.btnPrimary}>
                            Get Started
                        </Link>
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
                    <h1 className={styles.heroTitle}>
                        Your Law Firm's
                        <span className={styles.gradient}> Digital Operating System</span>
                    </h1>
                    <p className={styles.heroDescription}>
                        Reforma transforms how law firms operate. Manage briefs, track cases,
                        collaborate with your team, and gain insights all in one intelligent platform
                        built specifically for modern legal practice.
                    </p>
                    <div className={styles.heroCTA}>
                        <Link href="/register" className={styles.btnHero}>
                            Start Your Firm
                            <ArrowRight size={20} />
                        </Link>
                        <Link href="/login" className={styles.btnHeroSecondary}>
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className={styles.features}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Everything Your Firm Needs</h2>
                        <p className={styles.sectionDescription}>
                            A comprehensive suite of tools designed to streamline your legal practice
                        </p>
                    </div>

                    <div className={styles.featuresGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <FileText />
                            </div>
                            <h3 className={styles.featureTitle}>Brief Manager</h3>
                            <p className={styles.featureDescription}>
                                Organize, store, and retrieve all your legal documents with intelligent
                                search and categorization. Never lose track of important briefs again.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Calendar />
                            </div>
                            <h3 className={styles.featureTitle}>Litigation Tracker</h3>
                            <p className={styles.featureDescription}>
                                Track all your cases, court dates, and deadlines in one unified calendar.
                                Get automated reminders and never miss a critical date.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Users />
                            </div>
                            <h3 className={styles.featureTitle}>Client Management</h3>
                            <p className={styles.featureDescription}>
                                Manage client relationships, track matters, and maintain detailed records
                                of all interactions and case progress.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <BarChart3 />
                            </div>
                            <h3 className={styles.featureTitle}>Analytics & Insights</h3>
                            <p className={styles.featureDescription}>
                                Get real-time insights into your firm's performance, revenue tracking,
                                and case analytics to make data-driven decisions.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Shield />
                            </div>
                            <h3 className={styles.featureTitle}>Secure & Compliant</h3>
                            <p className={styles.featureDescription}>
                                Enterprise-grade security with data encryption and compliance with
                                Nigerian and global data protection standards.
                            </p>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>
                                <Users />
                            </div>
                            <h3 className={styles.featureTitle}>Team Collaboration</h3>
                            <p className={styles.featureDescription}>
                                Work seamlessly with your entire firm. Share documents, assign tasks,
                                and collaborate in real-time.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className={styles.howItWorks}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Simple to Get Started</h2>
                        <p className={styles.sectionDescription}>
                            From setup to daily operations in minutes
                        </p>
                    </div>

                    <div className={styles.stepsGrid}>
                        <div className={styles.step}>
                            <div className={styles.stepNumber}>01</div>
                            <h3 className={styles.stepTitle}>Create Your Workspace</h3>
                            <p className={styles.stepDescription}>
                                Sign up and set up your firm's workspace in under 2 minutes.
                                Customize it to match your firm's structure.
                            </p>
                        </div>

                        <div className={styles.step}>
                            <div className={styles.stepNumber}>02</div>
                            <h3 className={styles.stepTitle}>Invite Your Team</h3>
                            <p className={styles.stepDescription}>
                                Add team members with role-based access. Everyone gets their
                                own secure login and personalized dashboard.
                            </p>
                        </div>

                        <div className={styles.step}>
                            <div className={styles.stepNumber}>03</div>
                            <h3 className={styles.stepTitle}>Start Managing</h3>
                            <p className={styles.stepDescription}>
                                Upload briefs, add clients, schedule cases, and let Reforma
                                handle the rest. Focus on what you do best practicing law.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.cta}>
                <div className={styles.ctaContent}>
                    <h2 className={styles.ctaTitle}>Ready to Transform Your Practice?</h2>
                    <p className={styles.ctaDescription}>
                        Join modern law firms using Reforma to streamline operations and deliver better client service
                    </p>
                    <div className={styles.ctaButtons}>
                        <Link href="/register" className={styles.btnCtaPrimary}>
                            Create Your Firm
                            <ArrowRight size={20} />
                        </Link>
                        <Link href="/login" className={styles.btnCtaSecondary}>
                            Sign In to Your Account
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <div className={styles.logo}>
                            <Image
                                src="/images/logo-reforma.png"
                                alt="Reforma Logo"
                                width={120}
                                height={30}
                                className={styles.logoImage}
                            />
                        </div>
                        <p className={styles.footerTagline}>
                            The intelligent operating system for modern law firms
                        </p>
                    </div>
                    <div className={styles.footerCopyright}>
                        © {new Date().getFullYear()} Reforma. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
