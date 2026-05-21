'use client';

import {
    FileText, Calendar, Users, BarChart3, Shield, ArrowRight,
    Zap, CheckCircle2, Loader2, TrendingUp, ShieldCheck,
    Scale, ChevronDown, ChevronUp, Sparkles, Brain
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './landing.module.css';
import { useEffect, useState, useRef } from 'react';
import { joinWaitlist } from '../actions/waitlist';
import SiteTracker from '@/components/analytics/SiteTracker';

const FAQS = [
    {
        q: 'Is Reforma built specifically for Nigerian law firms?',
        a: 'Yes. Reforma is designed from the ground up for the Nigerian legal market — Naira-denominated invoicing, compliance with local regulatory bodies (NBA, SEC, CAMA), and court schedules that reflect Nigerian procedural timelines.',
    },
    {
        q: 'What does onboarding look like?',
        a: 'Onboarding takes under 30 minutes. You set up your workspace, invite your team, upload your letterhead, and you are ready to go. Our onboarding wizard guides you through each step and our support team is available throughout.',
    },
    {
        q: 'How is my firm\'s data secured?',
        a: 'All data is encrypted at rest and in transit. We use enterprise-grade PostgreSQL infrastructure hosted in the EU with automated daily backups. Role-based access controls ensure that only the right people can see the right information.',
    },
    {
        q: 'Can I import existing client and matter records?',
        a: 'Yes. We support bulk import via CSV for clients and matters. Our team can assist with data migration from spreadsheets or legacy systems during your onboarding period.',
    },
    {
        q: 'What subscription plans are available?',
        a: 'Reforma offers tiered plans based on firm size and feature requirements. Pricing is in Naira with no foreign exchange exposure. Contact us or join the waitlist to receive current pricing details for your firm.',
    },
    {
        q: 'Does Reforma work on mobile?',
        a: 'Yes. Reforma is a Progressive Web App (PWA) — it installs on your phone like a native app and works across iOS, Android, and desktop. Push notifications keep your team updated on court dates and deadlines wherever they are.',
    },
];

const FEATURES = [
    {
        icon: FileText,
        title: 'Briefs & Documents',
        desc: 'Centralise your entire document archive. Search through years of litigation and advisory work in seconds with built-in OCR and AI-powered retrieval.',
    },
    {
        icon: Scale,
        title: 'Matter Management',
        desc: 'Track every case from intake to judgment. Assign lawyers, log court outcomes, set milestones, and never miss a next court date.',
    },
    {
        icon: Calendar,
        title: 'Court Calendar',
        desc: 'A single calendar for every court date, deadline, and appointment across your firm. Automated reminders sent 3 days, 2 days, and day-of.',
    },
    {
        icon: TrendingUp,
        title: 'Invoicing & Payments',
        desc: 'Generate professional Naira invoices with your letterhead in one click. Accept online payments via Monnify and track every kobo owed.',
    },
    {
        icon: BarChart3,
        title: 'Firm Analytics',
        desc: 'Revenue trends, lawyer productivity, client value, and compliance scores — all in one dashboard updated in real time.',
    },
    {
        icon: Brain,
        title: 'Eureka AI',
        desc: 'Your firm\'s AI legal assistant. Ask questions, draft documents, and retrieve case history in plain English — grounded in your actual workspace data.',
    },
    {
        icon: ShieldCheck,
        title: 'Compliance Tracker',
        desc: 'Never miss a regulatory filing. Track obligations across NBA, SEC, CAC, and FIRS with automated deadline alerts and completion scoring.',
    },
    {
        icon: Users,
        title: 'Team & Access Control',
        desc: 'Nine seniority-based roles from Intern to Managing Partner. Each role sees only what they need. Guests and external counsel handled gracefully.',
    },
];

function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`${styles.faqItem} ${open ? styles.faqItemOpen : ''}`}>
            <button className={styles.faqQuestion} onClick={() => setOpen(o => !o)}>
                <span>{q}</span>
                {open ? <ChevronUp size={18} className={styles.faqChevron} /> : <ChevronDown size={18} className={styles.faqChevron} />}
            </button>
            {open && <p className={styles.faqAnswer}>{a}</p>}
        </div>
    );
}

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const waitlistRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const htmlPrev = document.documentElement.style.overflowY;
        const bodyPrev = document.body.style.overflowY;
        document.documentElement.style.overflowY = 'auto';
        document.body.style.overflowY = 'auto';
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.documentElement.style.overflowY = htmlPrev;
            document.body.style.overflowY = bodyPrev;
        };
    }, []);

    const scrollToWaitlist = () => waitlistRef.current?.scrollIntoView({ behavior: 'smooth' });

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
        <div className={styles.page}>
            <SiteTracker page="/landing" />

            {/* ── Nav ─────────────────────────────────────── */}
            <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
                <div className={styles.navInner}>
                    <Image src="/images/logo-reforma.png" alt="Reforma" width={130} height={32} priority />
                    <div className={styles.navRight}>
                        <Link href="/login" className={styles.navLogin}>Log in</Link>
                        <button onClick={scrollToWaitlist} className={styles.navCta}>
                            Request Access
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────── */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroBadge}>
                        <Sparkles size={13} />
                        Built for Nigerian Legal Practice
                    </div>
                    <h1 className={styles.heroTitle}>
                        Run Your Firm <br />
                        <span className={styles.heroAccent}>With Precision.</span>
                    </h1>
                    <p className={styles.heroSub}>
                        Reforma brings briefs, matters, invoicing, compliance, and AI into a single
                        platform designed for the modern Nigerian law firm.
                    </p>
                    <div className={styles.heroCtas}>
                        <button onClick={scrollToWaitlist} className={styles.btnPrimary}>
                            Request Early Access <ArrowRight size={17} />
                        </button>
                        <Link href="/register?pilot=true" className={styles.btnOutline}>
                            Join Pilot Program
                        </Link>
                    </div>
                    <div className={styles.heroStats}>
                        <div className={styles.heroStat}>
                            <span className={styles.heroStatNum}>8+</span>
                            <span className={styles.heroStatLabel}>Core modules</span>
                        </div>
                        <div className={styles.heroStatDivider} />
                        <div className={styles.heroStat}>
                            <span className={styles.heroStatNum}>9</span>
                            <span className={styles.heroStatLabel}>Role types</span>
                        </div>
                        <div className={styles.heroStatDivider} />
                        <div className={styles.heroStat}>
                            <span className={styles.heroStatNum}>₦</span>
                            <span className={styles.heroStatLabel}>Naira-native</span>
                        </div>
                        <div className={styles.heroStatDivider} />
                        <div className={styles.heroStat}>
                            <span className={styles.heroStatNum}>PWA</span>
                            <span className={styles.heroStatLabel}>Works on mobile</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Demo Video ───────────────────────────────── */}
            <section className={styles.videoSection}>
                <div className={styles.container}>
                    <p className={styles.eyebrow}>Product Demo</p>
                    <h2 className={styles.sectionTitle}>See Reforma in Action</h2>
                    <p className={styles.sectionSub}>
                        Watch how Reforma transforms the daily operations of a modern Nigerian law firm.
                    </p>
                    <div className={styles.videoWrap}>
                        <iframe
                            src="https://www.youtube.com/embed/z69dSOj_qog"
                            className={styles.videoFrame}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Reforma Demo"
                        />
                    </div>
                </div>
            </section>

            {/* ── Features ─────────────────────────────────── */}
            <section className={styles.features}>
                <div className={styles.container}>
                    <p className={styles.eyebrow}>Platform</p>
                    <h2 className={styles.sectionTitle}>Everything Your Firm Needs</h2>
                    <p className={styles.sectionSub}>
                        A complete operational infrastructure — not a collection of disconnected tools.
                    </p>
                    <div className={styles.featuresGrid}>
                        {FEATURES.map(f => (
                            <div key={f.title} className={styles.featureCard}>
                                <div className={styles.featureIconWrap}>
                                    <f.icon size={20} />
                                </div>
                                <h3 className={styles.featureTitle}>{f.title}</h3>
                                <p className={styles.featureDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Why Reforma ──────────────────────────────── */}
            <section className={styles.why}>
                <div className={styles.whyInner}>
                    <div className={styles.whyText}>
                        <p className={styles.eyebrow}>Why Reforma</p>
                        <h2 className={styles.whyTitle}>Designed for the Way Nigerian Lawyers Actually Work</h2>
                        <p className={styles.whyBody}>
                            Most legal software is built for American or British firms and bolted on to the Nigerian
                            context. Reforma is different — it was designed from day one for Lagos, Abuja, and Port
                            Harcourt, with Naira invoicing, Nigerian court schedules, and local compliance requirements
                            built into the core.
                        </p>
                        <ul className={styles.whyList}>
                            {[
                                'Naira-native invoicing with Monnify payment integration',
                                'Court calendar with Nigerian procedural timelines',
                                'NBA, CAC, FIRS, and SEC compliance tracking',
                                'Role hierarchy matching Nigerian firm seniority structure',
                                'AI assistant trained on your firm\'s own data — not generic legal text',
                            ].map(item => (
                                <li key={item} className={styles.whyItem}>
                                    <CheckCircle2 size={17} className={styles.whyCheck} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button onClick={scrollToWaitlist} className={styles.btnPrimary} style={{ marginTop: '2rem' }}>
                            Request Early Access <ArrowRight size={17} />
                        </button>
                    </div>
                    <div className={styles.whyVisual}>
                        <div className={styles.whyCard}>
                            <div className={styles.whyCardHeader}>
                                <div className={styles.whyCardDot} style={{ background: '#ef4444' }} />
                                <div className={styles.whyCardDot} style={{ background: '#f59e0b' }} />
                                <div className={styles.whyCardDot} style={{ background: '#22c55e' }} />
                                <span className={styles.whyCardTitle}>Pulse Dashboard</span>
                            </div>
                            <div className={styles.whyCardBody}>
                                <div className={styles.whyStatRow}>
                                    <div className={styles.whyStat}>
                                        <span className={styles.whyStatVal}>24</span>
                                        <span className={styles.whyStatLbl}>Active Matters</span>
                                    </div>
                                    <div className={styles.whyStat}>
                                        <span className={styles.whyStatVal}>₦4.2M</span>
                                        <span className={styles.whyStatLbl}>Outstanding</span>
                                    </div>
                                    <div className={styles.whyStat}>
                                        <span className={styles.whyStatVal}>96%</span>
                                        <span className={styles.whyStatLbl}>Compliance</span>
                                    </div>
                                </div>
                                <div className={styles.whyActivity}>
                                    <p className={styles.whyActivityLabel}>Today's Court Dates</p>
                                    {[
                                        { name: 'Adeyemi v. UBA', court: 'Federal High Court, Lagos' },
                                        { name: 'Okonkwo Estate', court: 'Lagos State High Court' },
                                        { name: 'SEC v. Pinnacle', court: 'Investment & Securities Tribunal' },
                                    ].map(m => (
                                        <div key={m.name} className={styles.whyActivityItem}>
                                            <Scale size={13} className={styles.whyActivityIcon} />
                                            <div>
                                                <p className={styles.whyActivityName}>{m.name}</p>
                                                <p className={styles.whyActivityCourt}>{m.court}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FAQ ──────────────────────────────────────── */}
            <section className={styles.faq}>
                <div className={styles.faqInner}>
                    <p className={styles.eyebrow}>FAQ</p>
                    <h2 className={styles.sectionTitle}>Common Questions</h2>
                    <p className={styles.sectionSub}>
                        Everything you need to know before getting started.
                    </p>
                    <div className={styles.faqList}>
                        {FAQS.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
                    </div>
                </div>
            </section>

            {/* ── Waitlist ─────────────────────────────────── */}
            <section ref={waitlistRef} className={styles.waitlist}>
                <div className={styles.waitlistInner}>
                    <p className={styles.eyebrowLight}>Early Access</p>
                    <h2 className={styles.waitlistTitle}>Ready to Modernise Your Practice?</h2>
                    <p className={styles.waitlistSub}>
                        We are currently onboarding Nigerian law firms through a curated waitlist.
                        Secure your position today.
                    </p>

                    {submitStatus === 'success' ? (
                        <div className={styles.successBox}>
                            <CheckCircle2 size={36} className={styles.successIcon} />
                            <h3 className={styles.successTitle}>Application Received</h3>
                            <p className={styles.successMsg}>{message}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={styles.form}>
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
                            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                                {isSubmitting
                                    ? <><Loader2 size={16} className={styles.spin} /> Submitting…</>
                                    : 'Join the Waitlist'
                                }
                            </button>
                            {submitStatus === 'error' && (
                                <p className={styles.formError}>{message}</p>
                            )}
                        </form>
                    )}
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────── */}
            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <div className={styles.footerLeft}>
                        <Image src="/images/logo-reforma.png" alt="Reforma" width={110} height={28} />
                        <p className={styles.footerTagline}>Serious Infrastructure for Nigerian Law.</p>
                    </div>
                    <div className={styles.footerRight}>
                        <Link href="/login" className={styles.footerLink}>Log in</Link>
                        <Link href="/register" className={styles.footerLink}>Register</Link>
                        <span className={styles.footerCopy}>
                            © {new Date().getFullYear()} Reforma. All rights reserved.
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
