"use client";

import { ArrowRight, Shield, TrendingUp, Clock, Users, CheckCircle, Star, Zap } from 'lucide-react';
import { useState } from 'react';
import styles from './page.module.css';

export default function LandingPage() {
    const [email, setEmail] = useState('');

    const handleGetStarted = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Starting trial for:', email);
        // TODO: Implement trial signup
        alert('Trial signup coming soon!');
    };

    return (
        <div className={styles.landingPage}>
            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.badge}>
                        <Zap size={16} />
                        <span>Trusted by 50+ Nigerian Law Firms</span>
                    </div>

                    <h1 className={styles.heroTitle}>
                        Reclaim <span className={styles.highlight}>15 Hours</span> Per Week.
                        <br />
                        Run Your Law Firm Like a Business.
                    </h1>

                    <p className={styles.heroSubtitle}>
                        Stop losing ₦1M+ monthly to administrative chaos. Reforma gives you complete
                        visibility, bulletproof organization, and time back for billable work.
                    </p>

                    <form onSubmit={handleGetStarted} className={styles.heroForm}>
                        <input
                            type="email"
                            placeholder="Enter your work email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.emailInput}
                            required
                        />
                        <button type="submit" className={styles.primaryBtn}>
                            Start Free Trial
                            <ArrowRight size={20} />
                        </button>
                    </form>

                    <p className={styles.heroNote}>
                        ✓ No credit card required  ✓ Setup in 30 minutes  ✓ Cancel anytime
                    </p>
                </div>

                <div className={styles.heroVisual}>
                    <div className={styles.dashboardMockup}>
                        <div className={styles.mockupHeader}>
                            <div className={styles.mockupDots}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span className={styles.mockupTitle}>ReformaOS Dashboard</span>
                        </div>
                        <div className={styles.mockupContent}>
                            <div className={styles.mockupStats}>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Active Matters</span>
                                    <span className={styles.statValue}>47</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Revenue (MTD)</span>
                                    <span className={styles.statValue}>₦18.3M</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Court Dates</span>
                                    <span className={styles.statValue}>12</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className={styles.statsBar}>
                <div className={styles.statsContainer}>
                    <div className={styles.stat}>
                        <div className={styles.statNumber}>15hrs</div>
                        <div className={styles.statLabel}>Saved Weekly</div>
                    </div>
                    <div className={styles.stat}>
                        <div className={styles.statNumber}>50+</div>
                        <div className={styles.statLabel}>Law Firms</div>
                    </div>
                    <div className={styles.stat}>
                        <div className={styles.statNumber}>10K+</div>
                        <div className={styles.statLabel}>Documents Processed</div>
                    </div>
                    <div className={styles.stat}>
                        <div className={styles.statNumber}>98%</div>
                        <div className={styles.statLabel}>Client Satisfaction</div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className={styles.problemSection}>
                <div className={styles.sectionContainer}>
                    <h2 className={styles.sectionTitle}>The Hidden Cost of Disorganization</h2>
                    <p className={styles.sectionSubtitle}>
                        Every day without Reforma, you're losing money. Here's how:
                    </p>

                    <div className={styles.problemGrid}>
                        <div className={styles.problemCard}>
                            <div className={styles.problemIcon}>
                                <Clock size={32} />
                            </div>
                            <h3>2-3 Hours Daily on Admin</h3>
                            <p>At ₦50K/hour, that's ₦100K-150K lost per lawyer, every single day.</p>
                        </div>

                        <div className={styles.problemCard}>
                            <div className={styles.problemIcon}>
                                <TrendingUp size={32} />
                            </div>
                            <h3>Zero Financial Visibility</h3>
                            <p>Managing partners can't see daily expenses or revenue trends in real-time.</p>
                        </div>

                        <div className={styles.problemCard}>
                            <div className={styles.problemIcon}>
                                <Users size={32} />
                            </div>
                            <h3>Client Communication Gaps</h3>
                            <p>Scattered emails and notes lead to missed follow-ups and frustrated clients.</p>
                        </div>

                        <div className={styles.problemCard}>
                            <div className={styles.problemIcon}>
                                <Shield size={32} />
                            </div>
                            <h3>Malpractice Risk</h3>
                            <p>One missed court date or lost document could cost millions in damages.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solution Section */}
            <section className={styles.solutionSection}>
                <div className={styles.sectionContainer}>
                    <div className={styles.solutionHeader}>
                        <h2 className={styles.sectionTitle}>One Platform. Complete Control.</h2>
                        <p className={styles.sectionSubtitle}>
                            Everything you need to run a modern law firm, in one place.
                        </p>
                    </div>

                    <div className={styles.featureGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📋</div>
                            <h3>Matter Management</h3>
                            <p>Track every case from intake to resolution. Never lose sight of deadlines or client status.</p>
                            <ul className={styles.featureList}>
                                <li><CheckCircle size={16} /> Automated court date tracking</li>
                                <li><CheckCircle size={16} /> Client communication logs</li>
                                <li><CheckCircle size={16} /> Matter status dashboard</li>
                            </ul>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📄</div>
                            <h3>Intelligent Document Management</h3>
                            <p>OCR-powered search across all briefs and documents. Find anything in seconds.</p>
                            <ul className={styles.featureList}>
                                <li><CheckCircle size={16} /> Automatic OCR processing</li>
                                <li><CheckCircle size={16} /> Full-text search</li>
                                <li><CheckCircle size={16} /> Version control</li>
                            </ul>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📊</div>
                            <h3>Real-Time Analytics</h3>
                            <p>Know your firm's health in 30 seconds. Daily expenses, revenue, and performance metrics.</p>
                            <ul className={styles.featureList}>
                                <li><CheckCircle size={16} /> Daily expense tracking</li>
                                <li><CheckCircle size={16} /> Revenue analytics</li>
                                <li><CheckCircle size={16} /> Drill-down reporting</li>
                            </ul>
                        </div>

                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🔒</div>
                            <h3>Bank-Level Security</h3>
                            <p>Workspace isolation, encryption, and complete audit trails. Your data is sacred.</p>
                            <ul className={styles.featureList}>
                                <li><CheckCircle size={16} /> End-to-end encryption</li>
                                <li><CheckCircle size={16} /> Role-based access</li>
                                <li><CheckCircle size={16} /> Complete audit logs</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ROI Section */}
            <section className={styles.roiSection}>
                <div className={styles.sectionContainer}>
                    <h2 className={styles.sectionTitle}>The Math is Simple</h2>
                    <div className={styles.roiCalculator}>
                        <div className={styles.roiCard}>
                            <div className={styles.roiLabel}>Time Lost to Admin (Weekly)</div>
                            <div className={styles.roiValue}>15 hours × 5 lawyers</div>
                            <div className={styles.roiResult}>= 75 hours</div>
                        </div>
                        <div className={styles.roiOperator}>×</div>
                        <div className={styles.roiCard}>
                            <div className={styles.roiLabel}>Billing Rate</div>
                            <div className={styles.roiValue}>₦50,000/hour</div>
                            <div className={styles.roiResult}>standard rate</div>
                        </div>
                        <div className={styles.roiOperator}>=</div>
                        <div className={styles.roiCard + ' ' + styles.roiHighlight}>
                            <div className={styles.roiLabel}>Lost Revenue</div>
                            <div className={styles.roiValue}>₦3.75M</div>
                            <div className={styles.roiResult}>per month</div>
                        </div>
                    </div>
                    <p className={styles.roiConclusion}>
                        Reforma costs ₦200K/month. You recover ₦3M+. <strong>That's 15x ROI in month one.</strong>
                    </p>
                </div>
            </section>

            {/* Testimonials */}
            <section className={styles.testimonialSection}>
                <div className={styles.sectionContainer}>
                    <h2 className={styles.sectionTitle}>Trusted by Nigeria's Leading Firms</h2>

                    <div className={styles.testimonialGrid}>
                        <div className={styles.testimonialCard}>
                            <div className={styles.stars}>
                                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />)}
                            </div>
                            <p className={styles.testimonialText}>
                                "Reforma transformed our practice. We went from chaos to complete organization in 2 weeks.
                                Our clients notice the difference."
                            </p>
                            <div className={styles.testimonialAuthor}>
                                <div className={styles.authorInfo}>
                                    <div className={styles.authorName}>Adebayo Ogundimu, SAN</div>
                                    <div className={styles.authorTitle}>Managing Partner, Ogundimu & Associates</div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.testimonialCard}>
                            <div className={styles.stars}>
                                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />)}
                            </div>
                            <p className={styles.testimonialText}>
                                "The ROI is undeniable. We recovered 20 billable hours per week and can finally see
                                our firm's financial health in real-time."
                            </p>
                            <div className={styles.testimonialAuthor}>
                                <div className={styles.authorInfo}>
                                    <div className={styles.authorName}>Kemi Adeniran</div>
                                    <div className={styles.authorTitle}>Senior Partner, Adeniran Legal Chambers</div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.testimonialCard}>
                            <div className={styles.stars}>
                                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />)}
                            </div>
                            <p className={styles.testimonialText}>
                                "Setup took 30 minutes. Within a week, we couldn't imagine practicing without it.
                                The document search alone is worth the subscription."
                            </p>
                            <div className={styles.testimonialAuthor}>
                                <div className={styles.authorInfo}>
                                    <div className={styles.authorName}>Bola Okafor</div>
                                    <div className={styles.authorTitle}>Founding Partner, Okafor & Partners</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className={styles.finalCTA}>
                <div className={styles.ctaContainer}>
                    <h2 className={styles.ctaTitle}>Ready to Transform Your Practice?</h2>
                    <p className={styles.ctaSubtitle}>
                        Join 50+ Nigerian law firms already saving time and increasing revenue with Reforma.
                    </p>

                    <form onSubmit={handleGetStarted} className={styles.ctaForm}>
                        <input
                            type="email"
                            placeholder="Enter your work email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.ctaInput}
                            required
                        />
                        <button type="submit" className={styles.ctaButton}>
                            Start Free Trial
                            <ArrowRight size={20} />
                        </button>
                    </form>

                    <p className={styles.ctaNote}>
                        30-day free trial • No credit card required • Cancel anytime
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContainer}>
                    <div className={styles.footerBrand}>
                        <h3>Reforma</h3>
                        <p>Operational excellence for Nigerian law firms.</p>
                    </div>

                    <div className={styles.footerLinks}>
                        <div className={styles.footerColumn}>
                            <h4>Product</h4>
                            <a href="#features">Features</a>
                            <a href="#pricing">Pricing</a>
                            <a href="#security">Security</a>
                        </div>

                        <div className={styles.footerColumn}>
                            <h4>Company</h4>
                            <a href="#about">About</a>
                            <a href="#contact">Contact</a>
                            <a href="#careers">Careers</a>
                        </div>

                        <div className={styles.footerColumn}>
                            <h4>Legal</h4>
                            <a href="#privacy">Privacy Policy</a>
                            <a href="#terms">Terms of Service</a>
                            <a href="#compliance">Compliance</a>
                        </div>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <p>© 2025 Reforma. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
