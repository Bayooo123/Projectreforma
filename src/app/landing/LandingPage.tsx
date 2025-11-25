import Link from 'next/link';
import { Scale, Calendar, Users, BarChart3, Bell, Briefcase } from 'lucide-react';
import styles from './LandingPage.module.css';

export default function LandingPage() {
    return (
        <div className={styles.landing}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.logoSection}>
                        <Scale className={styles.logoIcon} size={48} />
                        <h1 className={styles.brandName}>ReformaOS</h1>
                    </div>
                    <h2 className={styles.headline}>
                        Modernize Your Legal Practice
                    </h2>
                    <p className={styles.subheadline}>
                        The all-in-one platform for law firms to manage briefs, track litigation,
                        handle clients, and gain insights—all in one beautiful interface.
                    </p>
                    <div className={styles.ctaButtons}>
                        <Link href="/dashboard" className={styles.primaryCta}>
                            Get Started
                        </Link>
                        <Link href="#features" className={styles.secondaryCta}>
                            Learn More
                        </Link>
                    </div>
                </div>
                <div className={styles.heroGradient}></div>
            </section>

            {/* Features Section */}
            <section id="features" className={styles.features}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Everything You Need</h2>
                    <p className={styles.sectionSubtitle}>
                        Powerful features designed for modern legal professionals
                    </p>
                </div>

                <div className={styles.featuresGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <Briefcase size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Brief Manager</h3>
                        <p className={styles.featureDescription}>
                            Organize, track, and manage all your legal briefs with intelligent document handling and OCR support.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <Scale size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Litigation Tracker</h3>
                        <p className={styles.featureDescription}>
                            Never miss a court date. Track all proceedings, deadlines, and case milestones in one place.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <Users size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Client Manager</h3>
                        <p className={styles.featureDescription}>
                            Comprehensive client management with invoicing, communication tracking, and relationship insights.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <BarChart3 size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Analytics Hub</h3>
                        <p className={styles.featureDescription}>
                            Executive dashboard with real-time insights into your practice's performance and growth.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <Bell size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Smart Notifications</h3>
                        <p className={styles.featureDescription}>
                            Intelligent alerts for dormant cases, upcoming deadlines, and client communication reminders.
                        </p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>
                            <Calendar size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>Calendar Integration</h3>
                        <p className={styles.featureDescription}>
                            Unified calendar view for all matters, court dates, and important events across your practice.
                        </p>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className={styles.benefits}>
                <div className={styles.benefitsContent}>
                    <h2 className={styles.benefitsTitle}>Why Choose ReformaOS?</h2>
                    <div className={styles.benefitsList}>
                        <div className={styles.benefit}>
                            <div className={styles.benefitNumber}>01</div>
                            <div className={styles.benefitText}>
                                <h3>Built for Legal Professionals</h3>
                                <p>Designed specifically for law firms, with features that understand your workflow.</p>
                            </div>
                        </div>
                        <div className={styles.benefit}>
                            <div className={styles.benefitNumber}>02</div>
                            <div className={styles.benefitText}>
                                <h3>Increase Efficiency</h3>
                                <p>Automate routine tasks and focus on what matters—serving your clients.</p>
                            </div>
                        </div>
                        <div className={styles.benefit}>
                            <div className={styles.benefitNumber}>03</div>
                            <div className={styles.benefitText}>
                                <h3>Data-Driven Insights</h3>
                                <p>Make informed decisions with comprehensive analytics and reporting.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.finalCta}>
                <h2 className={styles.finalCtaTitle}>Ready to Transform Your Practice?</h2>
                <p className={styles.finalCtaText}>
                    Join modern law firms using ReformaOS to streamline operations and deliver exceptional client service.
                </p>
                <Link href="/dashboard" className={styles.finalCtaButton}>
                    Get Started Now
                </Link>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <Scale size={24} />
                        <span>ReformaOS</span>
                    </div>
                    <p className={styles.footerCopyright}>
                        © 2025 ReformaOS. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
