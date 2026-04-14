'use client';

import { useState } from 'react';
import { 
    Search, 
    Book, 
    FileText, 
    Gavel, 
    ShieldCheck, 
    BarChart2, 
    MessageSquare, 
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Mail,
    Phone,
    ExternalLink
} from 'lucide-react';
import styles from './help.module.css';

const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: Book },
    { id: 'briefs', title: 'Briefs Manager', icon: FileText },
    { id: 'calendar', title: 'Calendar & Meetings', icon: Gavel },
    { id: 'compliance', title: 'Compliance', icon: ShieldCheck },
    { id: 'analytics', title: 'Analytics', icon: BarChart2 },
    { id: 'ai', title: 'Reforma AI', icon: MessageSquare },
    { id: 'faq', title: 'FAQs', icon: HelpCircle },
];

const faqs = [
    {
        question: "How do I invite a new team member?",
        answer: "Go to Settings > Firm and use the 'Invite Member' section. You can also provide your firm code and join password to colleagues for them to register manually."
    },
    {
        question: "Is my data secure and private?",
        answer: "Yes, Reforma uses end-to-end encryption for sensitive documents. Your firm's data is isolated and only accessible to authorized members of your workspace."
    },
    {
        question: "How does the AI transcription work?",
        answer: "When you record a meeting in the Calendar, the audio is processed by our secure AI engine (Gemini 1.5 Pro) to generate a verbatim transcript, summary, and action items."
    },
    {
        question: "Can I customize the branding of my invoices?",
        answer: "Absolutely. In Settings > Firm, you can upload your letterhead (PNG/JPG) and choose your brand color, which will be applied to all generated documents."
    }
];

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <h2>Help Center</h2>
                <nav className={styles.helpNav}>
                    {sections.map((section) => (
                        <a key={section.id} href={`#${section.id}`} className={styles.navItem}>
                            <section.icon size={18} />
                            {section.title}
                        </a>
                    ))}
                </nav>
            </aside>

            <main className={styles.content}>
                <header className={styles.header}>
                    <h1>How can we help?</h1>
                    <p>Search our knowledge base or browse features below.</p>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={20} />
                        <input 
                            type="text" 
                            placeholder="Search for articles, guides..." 
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                <section id="getting-started" className={styles.section}>
                    <h2><Book /> Getting Started</h2>
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <h3>Platform Overview</h3>
                            <p>Learn the basics of Reforma OS and how to navigate between different modules.</p>
                        </div>
                        <div className={styles.card}>
                            <h3>Workspace Setup</h3>
                            <p>Configure your firm settings, branding, and invite your first team members.</p>
                        </div>
                        <div className={styles.card}>
                            <h3>User Roles</h3>
                            <p>Understand the differences between Owner, Partner, Lawyer, and Staff roles.</p>
                        </div>
                    </div>
                </section>

                <section id="briefs" className={styles.section}>
                    <h2><FileText /> Briefs Manager</h2>
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <h3>Creating Briefs</h3>
                            <p>How to organize your litigation files and internal research into structured briefs.</p>
                        </div>
                        <div className={styles.card}>
                            <h3>Document Management</h3>
                            <p>Upload, version, and preview legal documents within your briefs.</p>
                        </div>
                        <div className={styles.card}>
                            <h3>OCR & Search</h3>
                            <p>Search across all your scanned documents using our built-in OCR technology.</p>
                        </div>
                    </div>
                </section>

                <section id="calendar" className={styles.section}>
                    <h2><Gavel /> Calendar & Meetings</h2>
                    <div className={styles.grid}>
                        <div className={styles.card}>
                            <h3>Court Dates</h3>
                            <p>Schedule court appearances and set automated reminders for your team.</p>
                        </div>
                        <div className={styles.card}>
                            <h3>Meeting Recording</h3>
                            <p>Record meetings and interviews directly within the platform for AI processing.</p>
                        </div>
                        <div className={styles.card}>
                            <h3>Transcription</h3>
                            <p>Access high-fidelity transcripts and AI-generated summaries of your recorded meetings.</p>
                        </div>
                    </div>
                </section>

                <section id="faq" className={styles.section}>
                    <h2><HelpCircle /> Frequently Asked Questions</h2>
                    <div className={styles.faqList}>
                        {faqs.map((faq, index) => (
                            <div key={index} className={styles.faqItem}>
                                <button className={styles.faqQuestion} onClick={() => toggleFaq(index)}>
                                    {faq.question}
                                    {openFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {openFaq === index && (
                                    <div className={styles.faqAnswer}>
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.supportCard}>
                        <h3>Still need help?</h3>
                        <p>Our support team is available Monday through Friday to assist with any technical issues.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={20} />
                                <span>support@reforma.com</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={20} />
                                <span>+234 800 REFORMA</span>
                            </div>
                        </div>
                        <a href="mailto:support@reforma.com" className={styles.supportButton}>
                            Contact Support
                        </a>
                    </div>
                </section>
            </main>
        </div>
    );
}
