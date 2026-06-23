'use client';

import {
    FileText, Calendar, Users, BarChart3, ArrowRight,
    CheckCircle2, Loader2, TrendingUp, ShieldCheck,
    Scale, ChevronDown, ChevronUp, Sparkles, Brain,
    Phone, MessageSquare, Clock, Send, Shield, Search, Link2
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
        a: 'All data is encrypted at rest and in transit. We use enterprise-grade PostgreSQL infrastructure with automated daily backups. Role-based access controls ensure that only the right people can see the right information.',
    },
    {
        q: 'Can I import existing client and matter records?',
        a: 'Yes. We support bulk import via CSV for clients and matters. Our team can assist with data migration from spreadsheets or legacy systems during your onboarding period.',
    },
    {
        q: 'What subscription plans are available?',
        a: 'Reforma offers tiered plans based on firm size and feature requirements. Pricing is in Naira with no foreign exchange exposure. Sign up to explore the platform, or contact us for enterprise pricing details.',
    },
    {
        q: 'Does Reforma work on mobile?',
        a: 'Yes. Reforma is a Progressive Web App (PWA) — it installs on your phone like a native app and works across iOS, Android, and desktop. Push notifications keep your team updated on court dates and deadlines wherever they are.',
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

function BrowserMock() {
    return (
        <div className={styles.browserMock}>
            <div className={styles.browserChrome}>
                <div className={styles.chromeDots}>
                    <span style={{ background: '#ef4444' }} />
                    <span style={{ background: '#f59e0b' }} />
                    <span style={{ background: '#22c55e' }} />
                </div>
                <div className={styles.chromeUrl}>app.reforma.ng/pulse</div>
            </div>
            <div className={styles.browserBody}>
                <div className={styles.mockSidebar}>
                    <div className={styles.mockLogoMark}>R</div>
                    <div className={styles.mockNavItems}>
                        {['P', 'B', 'C', '₦', '✦'].map((l, i) => (
                            <div key={i} className={`${styles.mockNavItem} ${i === 0 ? styles.mockNavActive : ''}`}>{l}</div>
                        ))}
                    </div>
                </div>
                <div className={styles.mockMain}>
                    <div className={styles.mockHeader}>
                        <span className={styles.mockTitle}>Pulse</span>
                        <span className={styles.mockDate}>Mon, 9 Jun 2026</span>
                    </div>
                    <div className={styles.mockStats}>
                        <div className={styles.mockStatCard}>
                            <span className={styles.mockStatVal}>24</span>
                            <span className={styles.mockStatLbl}>Active Matters</span>
                        </div>
                        <div className={styles.mockStatCard}>
                            <span className={styles.mockStatVal}>₦4.2M</span>
                            <span className={styles.mockStatLbl}>Outstanding</span>
                        </div>
                        <div className={`${styles.mockStatCard} ${styles.mockStatGreen}`}>
                            <span className={`${styles.mockStatVal} ${styles.mockStatValGreen}`}>96%</span>
                            <span className={styles.mockStatLbl}>Compliance</span>
                        </div>
                    </div>
                    <div className={styles.mockSectionLabel}>TODAY&apos;S COURT DATES</div>
                    <div className={styles.mockCourtList}>
                        {[
                            { name: 'Adeyemi v. UBA', court: 'FHC Lagos', time: '09:00', live: true },
                            { name: 'Okonkwo Estate', court: 'LSHC', time: '11:30', live: false },
                            { name: 'SEC v. Pinnacle', court: 'IST Abuja', time: '14:00', live: false },
                        ].map(m => (
                            <div key={m.name} className={styles.mockCourtItem}>
                                <div className={styles.mockCourtTime}>
                                    {m.time}
                                    {m.live && <span className={styles.mockLivePill}>LIVE</span>}
                                </div>
                                <div>
                                    <div className={styles.mockCourtName}>{m.name}</div>
                                    <div className={styles.mockCourtVenue}>{m.court}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PhoneMock() {
    return (
        <div className={styles.phoneWrap}>
            <div className={styles.phoneFrame}>
                <div className={styles.phoneNotch} />
                <div className={styles.phoneScreen}>
                    <div className={styles.phoneTime}>09:15</div>
                    <div className={styles.phoneDate}>Monday, 9 June</div>
                    <div className={styles.phoneCards}>
                        <div className={styles.phoneCard}>
                            <div className={styles.phoneCardDot} style={{ background: '#f59e0b' }} />
                            <div>
                                <div className={styles.phoneCardTitle}>Court at 09:00</div>
                                <div className={styles.phoneCardSub}>Adeyemi v. UBA · FHC Lagos</div>
                            </div>
                        </div>
                        <div className={styles.phoneCard}>
                            <div className={styles.phoneCardDot} style={{ background: '#34d399' }} />
                            <div>
                                <div className={styles.phoneCardTitle}>₦750,000 received</div>
                                <div className={styles.phoneCardSub}>Okonkwo Estate · just now</div>
                            </div>
                        </div>
                        <div className={styles.phoneCard}>
                            <div className={styles.phoneCardDot} style={{ background: '#818cf8' }} />
                            <div>
                                <div className={styles.phoneCardTitle}>Eureka insight ready</div>
                                <div className={styles.phoneCardSub}>Matter summary · BRF-0042</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EurekaChatMock() {
    return (
        <div className={styles.eurekaMock}>
            <div className={styles.eurekaMockHeader}>
                <div className={styles.eurekaMockDot} />
                <div className={styles.eurekaIconWrap}><Brain size={14} /></div>
                <span>Eureka</span>
                <span className={styles.eurekaStatusBadge}>Active</span>
            </div>
            <div className={styles.eurekaMockBody}>
                <div className={styles.eurekaUserMsg}>
                    What's the current status of Adeyemi v. UBA and are there any outstanding deadlines?
                </div>
                <div className={styles.eurekaAiMsg}>
                    <div className={styles.eurekaAiHeader}>
                        <Brain size={12} />
                        Eureka — working in BRF-0042
                    </div>
                    <p className={styles.eurekaAiText}>
                        Here's a live summary of <strong>Adeyemi v. UBA (BRF-0042)</strong> — FHC Lagos, Coram: Adeola J:
                    </p>
                    <div className={styles.eurekaDraftBlock}>
                        <div className={styles.eurekaDraftTitle}>MATTER STATUS</div>
                        <p>📅 Next hearing: <strong>15 Jul 2026</strong> — FHC Lagos</p>
                        <p>📨 Last filing: Respondent&apos;s brief received 3 Jun</p>
                        <p>💰 Outstanding: ₦750,000 (Invoice #INV-0084)</p>
                        <p>👤 Lawyer: A. Odumosu (Senior Associate)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const ctaRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const htmlPrev = document.documentElement.style.overflowY;
        const bodyPrev = document.body.style.overflowY;
        document.documentElement.style.overflowY = 'auto';
        document.body.style.overflowY = 'auto';
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.documentElement.style.overflowY = htmlPrev;
            document.body.style.overflowY = bodyPrev;
        };
    }, []);


    return (
        <div className={styles.page}>
            <SiteTracker page="/landing" />

            {/* ── Nav ─────────────────────────────────────── */}
            <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
                <div className={styles.navInner}>
                    <span className={`${styles.navWordmark} ${scrolled ? styles.navWordmarkDark : ''}`}>
                        Reforma
                    </span>
                    <div className={styles.navRight}>
                        <Link href="/login" className={`${styles.navLogin} ${scrolled ? '' : styles.navLoginLight}`}>
                            Log in
                        </Link>
                        <Link href="/register" className={`${styles.navCta} ${scrolled ? '' : styles.navCtaOutline}`}>
                            Sign up free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────── */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroLeft}>
                        <div className={styles.heroBadge}>
                            <span className={styles.heroBadgeDot} />
                            Now in private pilot · Lagos · Abuja · Port Harcourt
                        </div>
                        <h1 className={styles.heroTitle}>
                            Serious<br />Infrastructure<br />
                            <span className={styles.heroAccent}>for Nigerian Law.</span>
                        </h1>
                        <p className={styles.heroSub}>
                            Briefs, court calendars, Naira invoicing, compliance tracking,
                            and an AI assistant — built for the way Nigerian firms actually work.
                        </p>
                        <Link href="/register" className={styles.heroBtn}>
                            Get started — it&apos;s free <ArrowRight size={16} />
                        </Link>
                        <div className={styles.heroTrust}>
                            <div className={styles.heroTrustItem}>
                                <Shield size={13} /> NDPR-ready
                            </div>
                            <span className={styles.heroTrustDot}>·</span>
                            <div className={styles.heroTrustItem}>
                                <Scale size={13} /> Nigerian courts
                            </div>
                            <span className={styles.heroTrustDot}>·</span>
                            <div className={styles.heroTrustItem}>
                                <ShieldCheck size={13} /> End-to-end encrypted
                            </div>
                        </div>
                    </div>
                    <div className={styles.heroRight}>
                        <BrowserMock />
                    </div>
                </div>
            </section>

            {/* ── Proof Strip ──────────────────────────────── */}
            <div className={styles.proofStrip}>
                <div className={styles.proofInner}>
                    <span className={styles.proofLabel}>Currently in pilot with law firms across</span>
                    <span className={styles.proofCities}>Lagos · Abuja · Port Harcourt</span>
                </div>
            </div>

            {/* ── Features ─────────────────────────────────── */}
            <section className={styles.features}>
                <div className={styles.featuresInner}>
                    <p className={styles.eyebrow}>What&apos;s Inside</p>
                    <h2 className={styles.sectionTitle}>Everything Your Firm Needs</h2>
                    <p className={styles.sectionSub}>
                        A complete operational infrastructure — not a collection of disconnected tools.
                    </p>

                    <div className={styles.heroFeatureGrid}>
                        {[
                            {
                                icon: Brain,
                                title: 'Eureka AI',
                                tag: 'AI-powered',
                                desc: 'Your resident workspace agent. Ask questions, retrieve case information, and surface insights from across your entire firm.',
                            },
                            {
                                icon: TrendingUp,
                                title: 'Naira Invoicing',
                                tag: 'Finance',
                                desc: 'Professional ₦ invoices with your letterhead. Accept Monnify payments. Zero chasing.',
                            },
                            {
                                icon: ShieldCheck,
                                title: 'Compliance Tracker',
                                tag: 'Regulatory',
                                desc: 'Never miss an NBA, CAC, FIRS, or SEC deadline again. Automated alerts and scoring.',
                            },
                        ].map(f => (
                            <div key={f.title} className={styles.heroFeatureCard}>
                                <div className={styles.heroFeatureTag}>{f.tag}</div>
                                <div className={styles.heroFeatureIconWrap}><f.icon size={22} /></div>
                                <h3 className={styles.heroFeatureTitle}>{f.title}</h3>
                                <p className={styles.heroFeatureDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className={styles.supportGrid}>
                        {[
                            { icon: Scale, title: 'Matter Management', desc: 'Track every case from intake to judgment. Assign lawyers, log outcomes, set milestones.' },
                            { icon: Calendar, title: 'Court Calendar', desc: 'One calendar for every date and deadline across your firm. Reminders 3 days, 2 days, day-of.' },
                            { icon: FileText, title: 'Briefs & Documents', desc: 'Centralise your entire archive. Full-text OCR search across years of work in seconds.' },
                            { icon: Users, title: 'Team & Roles', desc: 'Nine seniority-based roles from Intern to Managing Partner. Tight access controls.' },
                            { icon: BarChart3, title: 'Firm Analytics', desc: 'Revenue, productivity, client value, compliance scores — all in one live dashboard.' },
                        ].map(f => (
                            <div key={f.title} className={styles.supportCard}>
                                <div className={styles.supportIconWrap}><f.icon size={17} /></div>
                                <h4 className={styles.supportTitle}>{f.title}</h4>
                                <p className={styles.supportDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Why Reforma ──────────────────────────────── */}
            <section className={styles.why}>
                <div className={styles.whyInner}>
                    <div className={styles.whyText}>
                        <p className={styles.eyebrowGreen}>Why Reforma</p>
                        <h2 className={styles.whyTitle}>Designed for the Way Nigerian Lawyers Actually Work</h2>
                        <p className={styles.whyBody}>
                            Most legal software is built for American or British firms and bolted onto the Nigerian
                            context. Reforma was designed from day one for Lagos, Abuja, and Port Harcourt — with
                            Naira invoicing, Nigerian court schedules, and local compliance built into the core.
                        </p>
                        <ul className={styles.whyList}>
                            {[
                                'Naira-native invoicing with Monnify payment integration',
                                'Court calendar with Nigerian procedural timelines',
                                'NBA, CAC, FIRS, and SEC compliance tracking',
                                'Role hierarchy matching Nigerian firm seniority structure',
                                'AI assistant grounded in your firm\'s own data — not generic legal text',
                            ].map(item => (
                                <li key={item} className={styles.whyItem}>
                                    <CheckCircle2 size={15} className={styles.whyCheck} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link href="/register" className={styles.btnPrimary} style={{ marginTop: '2rem' }}>
                            Get started <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className={styles.whyVisual}>
                        <div className={styles.dashMock}>
                            <div className={styles.dashMockHeader}>
                                <div className={styles.dashMockDots}>
                                    <span style={{ background: '#ef4444' }} />
                                    <span style={{ background: '#f59e0b' }} />
                                    <span style={{ background: '#22c55e' }} />
                                </div>
                                <span className={styles.dashMockTitle}>Pulse Dashboard</span>
                            </div>
                            <div className={styles.dashMockBody}>
                                <div className={styles.dashStatRow}>
                                    <div className={styles.dashStat}>
                                        <span className={styles.dashStatVal}>24</span>
                                        <span className={styles.dashStatLbl}>Active Matters</span>
                                    </div>
                                    <div className={styles.dashStat}>
                                        <span className={styles.dashStatVal}>₦4.2M</span>
                                        <span className={styles.dashStatLbl}>Outstanding</span>
                                    </div>
                                    <div className={styles.dashStat}>
                                        <span className={`${styles.dashStatVal} ${styles.dashStatValGreen}`}>96%</span>
                                        <span className={styles.dashStatLbl}>Compliance</span>
                                    </div>
                                </div>
                                <div className={styles.dashActivityLabel}>LIVE ACTIVITY</div>
                                <div className={styles.dashActivity}>
                                    {[
                                        { text: 'Adeyemi v. UBA', sub: 'FHC Lagos · 09:00', accent: '#f59e0b' },
                                        { text: 'Invoice #INV-0084 sent', sub: '₦750,000 · Okonkwo Estate', accent: '#34d399' },
                                        { text: 'SEC filing due in 3 days', sub: 'Pinnacle Capital Ltd', accent: '#ef4444' },
                                        { text: 'Eureka insight ready', sub: 'Matter summary · BRF-0042', accent: '#818cf8' },
                                    ].map((item, i) => (
                                        <div key={i} className={styles.dashActivityItem}>
                                            <div className={styles.dashActivityDot} style={{ background: item.accent }} />
                                            <div>
                                                <div className={styles.dashActivityText}>{item.text}</div>
                                                <div className={styles.dashActivitySub}>{item.sub}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Mobile Section ───────────────────────────── */}
            <section className={styles.mobile}>
                <div className={styles.mobileInner}>
                    <div className={styles.mobileLeft}>
                        <p className={styles.eyebrowLight}>Mobile</p>
                        <h2 className={styles.mobileTitle}>
                            Your office,<br />in your pocket.
                        </h2>
                        <p className={styles.mobileSub}>
                            Reforma is a Progressive Web App. Install it on your phone like a native app
                            and get push notifications for court dates, payments, and deadlines — wherever you are.
                        </p>
                        <div className={styles.mobileMoments}>
                            {[
                                { icon: Clock, text: 'Court reminders — 3 days, 2 days, morning-of' },
                                { icon: TrendingUp, text: 'Instant payment alerts the moment a client pays' },
                                { icon: Brain, text: 'Eureka on the go — get case insights wherever you are' },
                            ].map(m => (
                                <div key={m.text} className={styles.mobileMoment}>
                                    <div className={styles.mobileMomentIcon}><m.icon size={14} /></div>
                                    <span>{m.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.mobileRight}>
                        <PhoneMock />
                    </div>
                </div>
            </section>

            {/* ── Eureka Section ───────────────────────────── */}
            <section className={styles.eureka}>
                <div className={styles.eurekaInner}>
                    <div className={styles.eurekaLeft}>
                        <p className={styles.eyebrowLight}>Eureka AI</p>
                        <h2 className={styles.eurekaTitle}>
                            Your firm&apos;s AI.<br />Grounded in your actual work.
                        </h2>
                        <p className={styles.eurekaSub}>
                            Unlike general AI assistants, Eureka knows your cases, your clients,
                            and your workspace. It retrieves, surfaces, and acts — grounded in your firm&apos;s actual data.
                        </p>
                        <div className={styles.eurekaCaps}>
                            {[
                                'Retrieve case status, filings and deadlines instantly',
                                'Answer questions about any matter in plain English',
                                'Surface patterns across briefs, clients and correspondence',
                                'Link emails and documents to the right brief automatically',
                            ].map(cap => (
                                <div key={cap} className={styles.eurekaCap}>
                                    <Sparkles size={12} className={styles.eurekaCapIcon} />
                                    {cap}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.eurekaRight}>
                        <EurekaChatMock />
                    </div>
                </div>
            </section>

            {/* ── FAQ ──────────────────────────────────────── */}
            <section className={styles.faq} id="faq">
                <div className={styles.faqInner}>
                    <p className={styles.eyebrow}>FAQ</p>
                    <h2 className={styles.sectionTitle}>Common Questions</h2>
                    <p className={styles.sectionSub}>Everything you need to know before getting started.</p>
                    <div className={styles.faqList}>
                        {FAQS.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
                    </div>
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────── */}
            <section ref={ctaRef} id="cta" className={styles.cta}>
                <div className={styles.ctaInner}>
                    <div className={styles.ctaLeft}>
                        <p className={styles.eyebrowLight}>Get Started</p>
                        <h2 className={styles.ctaTitle}>Your firm, set up<br />in minutes.</h2>
                        <p className={styles.ctaSub}>
                            Create your workspace, invite your team, and start managing
                            matters — no waiting list, no sales call required.
                        </p>
                        <div className={styles.ctaContacts}>
                            <a href="tel:+2349031812675" className={styles.ctaContactItem}>
                                <Phone size={14} />
                                +234 903 181 2675
                            </a>
                            <a href="mailto:info@reforma.ng" className={styles.ctaContactItem}>
                                <MessageSquare size={14} />
                                info@reforma.ng
                            </a>
                        </div>
                    </div>
                    <div className={styles.ctaRight}>
                        <div className={styles.signupBox}>
                            <CheckCircle2 size={32} className={styles.successIcon} />
                            <h3 className={styles.signupBoxTitle}>Ready when you are</h3>
                            <p className={styles.signupBoxSub}>
                                Set up your firm workspace in under 5 minutes.
                                No credit card required.
                            </p>
                            <Link href="/register" className={styles.signupBoxBtn}>
                                Create your workspace <ArrowRight size={15} />
                            </Link>
                            <p className={styles.signupBoxNote}>
                                Already have an account? <Link href="/login" className={styles.signupBoxLink}>Sign in</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────── */}
            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <div className={styles.footerCol}>
                        <Image
                            src="/images/logo-reforma.png"
                            alt="Reforma"
                            width={110}
                            height={28}
                            className={styles.footerLogo}
                        />
                        <p className={styles.footerTagline}>Serious Infrastructure for Nigerian Law.</p>
                        <p className={styles.footerCopy}>© {new Date().getFullYear()} Reforma. All rights reserved.</p>
                    </div>
                    <div className={styles.footerCol}>
                        <h4 className={styles.footerColTitle}>Product</h4>
                        <Link href="#" className={styles.footerLink}>Briefs &amp; Documents</Link>
                        <Link href="#" className={styles.footerLink}>Court Calendar</Link>
                        <Link href="#" className={styles.footerLink}>Invoicing</Link>
                        <Link href="#" className={styles.footerLink}>Compliance</Link>
                        <Link href="#" className={styles.footerLink}>Eureka AI</Link>
                    </div>
                    <div className={styles.footerCol}>
                        <h4 className={styles.footerColTitle}>Company</h4>
                        <Link href="/login" className={styles.footerLink}>Log in</Link>
                        <Link href="/register" className={styles.footerLink}>Register</Link>
                        <Link href="#faq" className={styles.footerLink}>FAQ</Link>
                        <Link href="/register" className={styles.footerLink}>Sign up</Link>
                    </div>
                    <div className={styles.footerCol}>
                        <h4 className={styles.footerColTitle}>Contact</h4>
                        <a href="tel:+2349031812675" className={styles.footerLink}>+234 903 181 2675</a>
                        <a href="mailto:info@reforma.ng" className={styles.footerLink}>info@reforma.ng</a>
                        <p className={styles.footerAddress}>Lagos · Abuja · Port Harcourt</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
