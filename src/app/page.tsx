"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Simple Scroll Reveal Observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Reset any global styles that might be interfering
    // document.body.style.backgroundColor = "#f8fafc"; // Removed for dark mode compatibility

    // Strict observer implementation from user snippet
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Note: because we are using CSS modules, we need to handle the 'visible' class
          // which handles the opacity transition. 
          // In the styles file, we have .reveal and .visible.
          entry.target.classList.add(styles.visible);
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll(`.${styles.reveal}`);
    elements.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      // document.body.style.backgroundColor = ""; // Cleanup
    };
  }, []);

  return (
    <div className={styles.body}>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>R</div>
            <span className={styles.logoText}>Reforma</span>
          </div>
          <div className={styles.navButtons}>
            <ThemeToggle />
            {isLoggedIn ? (
              <Link href="/management" className={styles.navLink}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.navLink}>
                  Log In
                </Link>
                <Link href="/register" className={styles.navCta}>
                  Get Access
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>
            The Operating System for<br />
            <span className={styles.highlight}>High-Performance Law Firms</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Replace scattered spreadsheets and physical files with one secure infrastructure.
            Centralize briefs, automate finances, and track workload in a single workspace.
          </p>
          <div className={styles.heroButtons}>
            <Link href={isLoggedIn ? "/management" : "/register"} className={styles.btnPrimary}>
              {isLoggedIn ? "Go to Dashboard" : "Deploy Infrastructure"}
              <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
              </svg>
            </Link>
            <Link href="#system" className={styles.btnSecondary}>
              <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              How it works
            </Link>
          </div>
          <div className={styles.trustBar}>
            <span className={styles.trustLabel}>Trusted Infrastructure</span>
            <span className={styles.trustFirm}>LexChambers</span>
            <span className={styles.trustFirm}>ALUKO & CO</span>
            <span className={styles.trustFirm}>TEMPLARS</span>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className={styles.problem}>
        <div className={`${styles.problemContent} ${styles.reveal}`}>
          <h2>The "Institutional Memory" Gap</h2>
          <p>
            Most firms rely on the memory of senior partners and physical files. When a key associate leaves,
            critical knowledge is lost. Reforma digitizes this backbone, ensuring your firm's intelligence
            remains properly compounded and accessible.
          </p>
        </div>
      </section>

      {/* System Section */}
      <section id="system" className={styles.system}>
        <div className={styles.systemGrid}>
          <div className={`${styles.pillar} ${styles.reveal}`}>
            <div className={styles.pillarIcon}>
              <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <h3>The Digital Vault</h3>
            <p className={styles.pillarReplaces}>Replaces: Physical File Rooms & Shared Drives</p>
            <p>
              A centralized, immutable repository for every case file. Ensure continuity of service
              and instant retrieval of historical context.
            </p>
          </div>

          <div className={`${styles.pillar} ${styles.reveal}`}>
            <div className={styles.pillarIcon}>
              <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
              </svg>
            </div>
            <h3>Financial Operating System</h3>
            <p className={styles.pillarReplaces}>Replaces: Excel Spreadsheets & Manual Invoicing</p>
            <p>
              Automated revenue tracking and expense management. Gain real-time visibility into firm
              unit economics without a dedicated CFO.
            </p>
          </div>

          <div className={`${styles.pillar} ${styles.reveal}`}>
            <div className={styles.pillarIcon}>
              <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <h3>Partner Command Center</h3>
            <p className={styles.pillarReplaces}>Replaces: Weekly Status Meetings & WhatsApp Updates</p>
            <p>
              Live capacity tracking and deliverable monitoring. Answer "who is doing what" instantly
              and prevent associate burnout.
            </p>
          </div>
        </div>
      </section>

      {/* Drafter Section */}
      <section className={styles.drafter}>
        <div className={styles.drafterContent}>
          <div className={styles.reveal}>
            <div className={styles.drafterBadge}>Product Spotlight</div>
            <h2>The Socratic Drafter</h2>
            <p className={styles.drafterDesc}>
              Reforma acts as an intelligent senior associate. It drafts complex legal documents by
              interrogating the context stored in your Digital Vault.
            </p>
            <ul className={styles.drafterFeatures}>
              <li>
                <span className={styles.drafterCheck}>✓</span>
                <span>Pulls client facts directly from case history</span>
              </li>
              <li>
                <span className={styles.drafterCheck}>✓</span>
                <span>Asks strategic questions to resolve ambiguities</span>
              </li>
              <li>
                <span className={styles.drafterCheck}>✓</span>
                <span>Generates court-ready documents in seconds</span>
              </li>
            </ul>
          </div>

          <div className={`${styles.drafterDemo} ${styles.reveal}`}>
            <div className={styles.demoHeader}>
              <div className={styles.demoDots}>
                <div className={styles.demoDot}></div>
                <div className={styles.demoDot}></div>
              </div>
              <div className={styles.demoTitle}>drafting_engine.tsx</div>
            </div>

            <div className={styles.demoMessage}>
              <div className={`${styles.demoAvatar} ${styles.reformaAvatar}`}>R</div>
              <div>
                <div className={styles.demoName} style={{ color: '#5eead4' }}>Reforma</div>
                <div className={styles.demoText}>
                  I am reviewing the brief for <span className={styles.demoHighlight}>Suit CV/2024/005</span>.
                  The lease agreement mentions a guarantor, but the Statement of Claim does not plead against them.
                  <br /><br />
                  Should I add a paragraph pleading joint and several liability for the guarantor?
                </div>
              </div>
            </div>

            <div className={styles.demoMessage}>
              <div className={`${styles.demoAvatar} ${styles.userAvatar}`}>U</div>
              <div>
                <div className={styles.demoName} style={{ color: '#64748b' }}>Associate</div>
                <div className={styles.demoText} style={{ color: '#64748b' }}>
                  Yes, please include it. The guarantor is Mr. Okon.
                </div>
              </div>
            </div>

            <div className={styles.demoAction}>
              <div className={styles.demoPulse}></div>
              Drafting Paragraph 14 (Liability of Guarantor)...
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2>Build Your Firm's Infrastructure</h2>
          <p>
            Join the forward-thinking firms scaling their operations with Reforma.
          </p>
          <div className={styles.ctaButtons}>
            <Link href={isLoggedIn ? "/management" : "/register"} className={styles.btnPrimary}>
              {isLoggedIn ? "Go to Dashboard" : "Get Started"}
            </Link>
            <Link href="mailto:sales@reforma.ng" className={styles.btnSecondary}>Contact Sales</Link>
          </div>

          <div className={styles.footerMeta}>
            <div>© {new Date().getFullYear()} Reforma Digital Solutions Limited.</div>
            <div className={styles.footerLinks}>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
