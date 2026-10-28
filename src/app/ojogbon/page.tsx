'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Link2, PenLine, BookOpen, ShieldCheck, FileClock, ScrollText, ChevronDown } from 'lucide-react';
import SiteTracker from '@/components/analytics/SiteTracker';
import styles from './ojogbon.module.css';

const STEPS_TOPIC = ['Understanding the topic', 'Preparing an outline', 'Pulling potential references'];
const STEPS_DRAFT = [
    'Identifying gaps in the existing literature',
    'Situating your work within the existing literature',
    'Identifying rebuttals to your arguments',
];

const FLOW = [
    { title: 'Bring what you have', body: 'A topic, an outline or a full draft. Upload a .docx or paste it in.' },
    { title: 'Get your phases', body: 'Your paper split into sections, each with a brief, a word target and what to read first.' },
    { title: 'Write, in any order', body: 'A notepad for every phase. Jump to whatever you have energy for today.' },
    { title: 'Get notes', body: '“This claim needs a reference.” “The argument skips a step.” With sources to check.' },
    { title: 'Final review', body: 'The whole paper read like a peer reviewer would, with scores and a verdict on readiness.' },
];

const PRINCIPLES = [
    {
        icon: PenLine,
        title: 'No ghostwriting',
        body: 'Ojogbon never puts generated text into your draft. It asks, points and critiques. Every sentence is yours.',
        soon: false,
    },
    {
        icon: Link2,
        title: 'Real references only',
        body: 'Papers link to real records in scholarly databases. Anything Ojogbon can’t verify is labelled “check before citing”.',
        soon: false,
    },
    {
        icon: FileClock,
        title: 'Authorship trail',
        body: 'Your phase history, timestamps and the notes you acted on, in a report you can share with your supervisor.',
        soon: true,
    },
    {
        icon: ScrollText,
        title: 'Disclosure built in',
        body: 'An AI-use statement drawn from your trail and matched to your institution’s policy.',
        soon: true,
    },
];

const AUDIENCES = [
    {
        tag: 'Students',
        title: 'Final-year projects and long essays',
        body: 'Know what to write next, get honest feedback early, and stop worrying about whether your sources are real.',
    },
    {
        tag: 'Scholars',
        title: 'LL.M, PhD and journal articles',
        body: 'A research engine that finds the gaps, places your work in the literature and prepares you for reviewers.',
    },
    {
        tag: 'Supervisors and faculties',
        title: 'Better drafts, earlier',
        body: 'Students arrive with structured drafts, and you can see how each one was written.',
    },
];

const FAQS = [
    {
        q: 'Will Ojogbon write my paper for me?',
        a: 'No. That is the point. Ojogbon plans, questions, finds sources and critiques, but the writing is yours. It never inserts generated text into your draft.',
    },
    {
        q: 'Is using Ojogbon allowed at my university?',
        a: 'Policies differ, so check yours. Ojogbon is designed to fit the rules universities are adopting: it builds your skill instead of replacing it, and the authorship trail and disclosure statement (coming soon) let you show exactly how you used it.',
    },
    {
        q: 'Are the references real?',
        a: 'Papers come from scholarly databases with links to the actual record. Cases and statutes link to searchable Nigerian law sources. Anything Ojogbon cannot verify is clearly labelled so you check it before citing.',
    },
    {
        q: 'Which subjects does it support?',
        a: 'Any subject that involves long-form academic writing. We are starting with law, where Nigerian legal authority matters most, and expanding from there.',
    },
    {
        q: 'What does it cost?',
        a: 'Ojogbon is free while in early access. Plans for students, scholars and institutions will follow, and early users will hear first.',
    },
];

function ResearchDemo() {
    const total = STEPS_TOPIC.length + STEPS_DRAFT.length;
    const [done, setDone] = useState(total);

    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        // Starts fully ticked (complete at rest), then loops through the steps.
        const id = window.setInterval(() => setDone(d => (d >= total + 2 ? 0 : d + 1)), 1100);
        return () => window.clearInterval(id);
    }, [total]);

    const row = (label: string, i: number) => {
        const state = i < done ? 'done' : i === done ? 'run' : 'wait';
        return (
            <li key={label} className={`${styles.step} ${styles[`step_${state}`]}`}>
                <span className={styles.stepIcon} aria-hidden="true">
                    {state === 'done' ? <Check size={14} strokeWidth={3} /> : null}
                </span>
                <span>{label}</span>
            </li>
        );
    };

    return (
        <div className={styles.demo} aria-label="Ojogbon's research steps">
            <div className={styles.demoBar}>
                <i style={{ width: `${(Math.min(done, total) / total) * 100}%` }} />
            </div>
            <p className={styles.demoLabel}>With just a topic</p>
            <ol className={styles.steps}>{STEPS_TOPIC.map((s, i) => row(s, i))}</ol>
            <p className={styles.demoLabel}>With a solid draft, it also starts</p>
            <ol className={styles.steps}>{STEPS_DRAFT.map((s, i) => row(s, i + STEPS_TOPIC.length))}</ol>
        </div>
    );
}

function ProductMock() {
    return (
        <div className={styles.mock} aria-label="A preview of the Ojogbon writing workspace">
            <div className={styles.mockRail}>
                <p className={styles.mockTopic}>Why should businesses register?</p>
                {['Opening and thesis', 'The trader’s view', 'What registration gives', 'What the courts say', 'History'].map(
                    (t, i) => (
                        <div key={t} className={`${styles.mockPhase} ${i === 2 ? styles.mockPhaseOn : ''}`}>
                            <span>{String(i + 1).padStart(2, '0')}</span>
                            {t}
                            <em className={i < 2 ? styles.dotDone : i === 2 ? styles.dotDraft : ''} />
                        </div>
                    ),
                )}
            </div>
            <div className={styles.mockMain}>
                <p className={styles.mockEyebrow}>Phase 3 of 10 · aim for ~1,200 words</p>
                <p className={styles.mockTitle}>What registration gives in law</p>
                <div className={styles.mockPaper}>
                    <p>
                        Incorporation creates a separate legal person. Yet{' '}
                        <mark>registration rarely gives a small business anything it can use in the market</mark>, and
                        the courts have never said why it matters…
                    </p>
                </div>
                <div className={styles.mockNote}>
                    <span className={styles.mockKind}>Needs a reference</span>
                    <p>This is your central claim. Support it with evidence before you build on it.</p>
                    <p className={styles.mockSrc}>
                        <Link2 size={14} aria-hidden="true" /> Campos et al. (2018), <i>J. Dev. Econ.</i> · Open paper
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function OjogbonPage() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <div className={styles.page}>
            <SiteTracker page="/ojogbon" />

            <header className={styles.nav}>
                <div className={styles.navInner}>
                    <a href="#top" className={styles.wordmark}>
                        Ojogbon
                    </a>
                    <nav className={styles.navLinks} aria-label="Sections">
                        <a href="#how">How it works</a>
                        <a href="#ethics">Ethical AI</a>
                        <a href="#faq">FAQ</a>
                    </nav>
                    <Link href="/ojogbon/login" className={styles.navLogin}>
                        Log in
                    </Link>
                    <Link href="/ojogbon/signup" className={styles.navCta}>
                        Start writing
                    </Link>
                </div>
            </header>

            <main id="top">
                {/* Hero */}
                <section className={styles.hero}>
                    <div className={styles.heroInner}>
                        <div className={styles.heroCopy}>
                            <p className={styles.eyebrowLight}>Academic writing, supervised</p>
                            <h1 className={styles.h1}>
                                The writing supervisor <span className={styles.mark}>every student</span> deserves.
                            </h1>
                            <p className={styles.lede}>
                                Ojogbon breaks your paper into phases, tells you what to write and read in each, and
                                checks your work as you go. It never writes it for you.
                            </p>
                            <div className={styles.heroCtas}>
                                <Link href="/ojogbon/signup" className={styles.btnPrimary}>
                                    Start writing free <ArrowRight size={18} aria-hidden="true" />
                                </Link>
                                <a href="#how" className={styles.btnGhost}>
                                    See how it works
                                </a>
                            </div>
                            <p className={styles.meaning}>
                                <i lang="yo">Ọ̀jọ̀gbọ́n</i> (Yoruba): professor, the learned one.
                            </p>
                        </div>
                        <ProductMock />
                    </div>
                </section>

                {/* Problem */}
                <section className={styles.section}>
                    <div className={styles.inner}>
                        <p className={styles.eyebrow}>The problem</p>
                        <h2 className={styles.h2}>Long-form writing is where students get stuck.</h2>
                        <div className={styles.grid3}>
                            <article className={styles.card}>
                                <h3>The blank page</h3>
                                <p>No one teaches you how to break a paper into parts, so it waits until the last week.</p>
                            </article>
                            <article className={styles.card}>
                                <h3>Thin supervision</h3>
                                <p>Supervisors carry too many students to give feedback on every section of every draft.</p>
                            </article>
                            <article className={styles.card}>
                                <h3>Sources you can’t trust</h3>
                                <p>Literature reviews are hard, and AI chatbots invent citations that look real.</p>
                            </article>
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section className={`${styles.section} ${styles.sectionAlt}`} id="how">
                    <div className={styles.inner}>
                        <p className={styles.eyebrow}>How it works</p>
                        <h2 className={styles.h2}>Like a good supervisor, one phase at a time.</h2>
                        <ol className={styles.flow}>
                            {FLOW.map((f, i) => (
                                <li key={f.title} className={styles.flowItem}>
                                    <span className={styles.flowNum}>{String(i + 1).padStart(2, '0')}</span>
                                    <h3>{f.title}</h3>
                                    <p>{f.body}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Research engine */}
                <section className={styles.section}>
                    <div className={`${styles.inner} ${styles.split}`}>
                        <div>
                            <p className={styles.eyebrow}>The research engine</p>
                            <h2 className={styles.h2}>It goes deeper as your draft grows.</h2>
                            <p className={styles.body}>
                                With a topic, Ojogbon builds your outline and pulls references matched to each phase.
                                Once you have a real draft, it does what a demanding supervisor would: shows you the gaps
                                in the literature, where your work sits, and which rebuttals to prepare for.
                            </p>
                            <p className={styles.callout}>
                                <BookOpen size={20} aria-hidden="true" />
                                Every paper links to a real record in a scholarly database. Cases and statutes link to
                                Nigerian law sources.
                            </p>
                        </div>
                        <ResearchDemo />
                    </div>
                </section>

                {/* Ethics */}
                <section className={styles.ethics} id="ethics">
                    <div className={styles.inner}>
                        <p className={styles.eyebrowDark}>Ethical AI, by design</p>
                        <h2 className={styles.h2}>
                            Detection catches misuse after the fact. Ojogbon shapes how AI is used while you write.
                        </h2>
                        <div className={styles.grid2}>
                            {PRINCIPLES.map(p => (
                                <article key={p.title} className={styles.principle}>
                                    <p.icon size={26} aria-hidden="true" />
                                    <h3>
                                        {p.title}
                                        {p.soon && <span className={styles.soon}>Coming soon</span>}
                                    </h3>
                                    <p>{p.body}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Audiences */}
                <section className={styles.section}>
                    <div className={styles.inner}>
                        <p className={styles.eyebrow}>Who it’s for</p>
                        <h2 className={styles.h2}>Built for the people around the paper.</h2>
                        <div className={styles.grid3}>
                            {AUDIENCES.map(a => (
                                <article key={a.tag} className={styles.card}>
                                    <span className={styles.tag}>{a.tag}</span>
                                    <h3>{a.title}</h3>
                                    <p>{a.body}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className={`${styles.section} ${styles.sectionAlt}`} id="faq">
                    <div className={`${styles.inner} ${styles.narrow}`}>
                        <p className={styles.eyebrow}>Questions</p>
                        <h2 className={styles.h2}>What people ask first.</h2>
                        <div className={styles.faq}>
                            {FAQS.map((f, i) => (
                                <div key={f.q} className={styles.faqItem}>
                                    <button
                                        type="button"
                                        className={styles.faqQ}
                                        aria-expanded={open === i}
                                        aria-controls={`faq-${i}`}
                                        onClick={() => setOpen(open === i ? null : i)}
                                    >
                                        {f.q}
                                        <ChevronDown size={20} aria-hidden="true" className={open === i ? styles.chevOpen : ''} />
                                    </button>
                                    <p id={`faq-${i}`} className={styles.faqA} hidden={open !== i}>
                                        {f.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Sign up */}
                <section className={styles.pilot} id="start">
                    <div className={`${styles.inner} ${styles.split}`}>
                        <div>
                            <p className={styles.eyebrowLight}>Early access</p>
                            <h2 className={styles.h2}>Put a professor beside you for your next paper.</h2>
                            <p className={styles.bodyLight}>
                                Create an account and go straight to the writing studio. Bring a topic, an outline or a
                                draft, and add the papers you’re reading.
                            </p>
                            <ul className={styles.pilotList}>
                                <li>
                                    <ShieldCheck size={20} aria-hidden="true" /> Free while in early access
                                </li>
                                <li>
                                    <ShieldCheck size={20} aria-hidden="true" /> Your drafts stay private to your account
                                </li>
                                <li>
                                    <ShieldCheck size={20} aria-hidden="true" /> Built first for law, open to every subject
                                </li>
                            </ul>
                        </div>
                        <div className={styles.formDone} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
                            <p>Ready when you are.</p>
                            <Link href="/ojogbon/signup" className={styles.btnPrimary}>
                                Create your account <ArrowRight size={18} aria-hidden="true" />
                            </Link>
                            <p style={{ fontSize: 15, fontWeight: 400 }}>
                                Already have one? <Link href="/ojogbon/login">Log in</Link>
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <span className={styles.wordmarkSmall}>Ojogbon</span>
                    <span>A product of Reforma Digital Solutions Limited · © {new Date().getFullYear()}</span>
                </div>
            </footer>
        </div>
    );
}
