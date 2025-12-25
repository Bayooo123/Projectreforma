"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, ChevronRight, Check } from "lucide-react";

export default function LandingPage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Simple Scroll Reveal Observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] text-slate-900 overflow-x-hidden">
      <style jsx global>{`
        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16">
        <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-teal-700 rounded-md flex items-center justify-center text-white font-bold text-sm leading-none">R</div>
            <span className="text-sm font-bold tracking-tight text-slate-900 uppercase">Reforma</span>
          </div>
          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <Link href="/management" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Log In
                </Link>
                <Link href="/register" className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors">
                  Get Access
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-40 pb-24 px-6 bg-white border-b border-slate-100 text-center">
        <div className="max-w-[960px] mx-auto">
          <h1 className="text-[3.75rem] font-bold tracking-tight text-slate-900 mb-6 leading-[1.15]">
            The Operating System for <br />
            <span className="text-teal-700">High-Performance Law Firms</span>
          </h1>

          <p className="text-lg text-slate-500 max-w-[720px] mx-auto mb-10 leading-[1.7]">
            Replace scattered spreadsheets and physical files with one secure infrastructure.
            Centralize briefs, automate finances, and track workload in a single workspace.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {isLoggedIn ? (
              <Link href="/management" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white rounded-lg font-medium transition-all hover:bg-teal-800 hover:-translate-y-[1px] shadow-sm">
                Dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white rounded-lg font-medium transition-all hover:bg-teal-800 hover:-translate-y-[1px] shadow-sm">
                Deploy Infrastructure
                <ArrowRight size={18} />
              </Link>
            )}
            <Link href="#system" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium transition-all hover:bg-slate-50 hover:border-slate-300">
              How it works
            </Link>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Trusted Infrastructure</span>
            <span className="text-slate-500 font-serif font-bold italic">LexChambers</span>
            <span className="text-slate-500 font-serif font-bold">ALUKO & CO</span>
            <span className="text-slate-500 font-serif font-bold tracking-widest">TEMPLARS</span>
          </div>
        </div>
      </header>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-[800px] mx-auto text-center reveal">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">The "Institutional Memory" Gap</h2>
          <p className="text-base text-slate-600 leading-[1.7]">
            Most firms rely on the memory of senior partners and physical files. When a key associate leaves,
            critical knowledge is lost. Reforma digitizes this backbone, ensuring your firm's intelligence
            remains properly compounded and accessible.
          </p>
        </div>
      </section>

      {/* System Section */}
      <section id="system" className="py-24 px-6 bg-white">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Pillar 1 */}
          <div className="group reveal hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-6 group-hover:bg-teal-700/5 group-hover:border-teal-700/10 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">The Digital Vault</h3>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-4">
              Replaces: Physical File Rooms & Shared Drives
            </div>
            <p className="text-slate-600 text-sm leading-[1.7]">
              A centralized, immutable repository for every case file. Ensure continuity of service and instant retrieval of historical context.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="group reveal delay-100 hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-6 group-hover:bg-teal-700/5 group-hover:border-teal-700/10 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Financial Operating System</h3>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-4">
              Replaces: Excel Spreadsheets & Manual Invoicing
            </div>
            <p className="text-slate-600 text-sm leading-[1.7]">
              Automated revenue tracking and expense management. Gain real-time visibility into firm unit economics without a dedicated CFO.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="group reveal delay-200 hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-6 group-hover:bg-teal-700/5 group-hover:border-teal-700/10 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Partner Command Center</h3>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-4">
              Replaces: Weekly Status Meetings & WhatsApp Updates
            </div>
            <p className="text-slate-600 text-sm leading-[1.7]">
              Live capacity tracking and deliverable monitoring. Answer "who is doing what" instantly and prevent associate burnout.
            </p>
          </div>

        </div>
      </section>

      {/* Drafter Section */}
      <section className="py-24 px-6 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-[1280px] mx-auto grid md:grid-cols-2 gap-16 items-center">

          <div className="reveal">
            <div className="inline-flex px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-bold uppercase tracking-widest mb-6">
              Product Spotlight
            </div>
            <h2 className="text-[2rem] font-bold mb-4">The Socratic Drafter</h2>
            <p className="text-slate-400 mb-8 leading-[1.7]">
              Reforma acts as an intelligent senior associate. It drafts complex legal documents by interrogating the context stored in your Digital Vault.
            </p>

            <ul className="space-y-4">
              <li className="flex gap-3 text-sm text-slate-300">
                <Check size={18} className="text-teal-500 shrink-0" />
                <span>Pulls client facts directly from case history</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-300">
                <Check size={18} className="text-teal-500 shrink-0" />
                <span>Asks strategic questions to resolve ambiguities</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-300">
                <Check size={18} className="text-teal-500 shrink-0" />
                <span>Generates court-ready documents in seconds</span>
              </li>
            </ul>
          </div>

          {/* Drafter Demo (Dark/Code Metaphor) */}
          <div className="bg-[#020617] border border-slate-800 rounded-lg p-6 shadow-2xl reveal delay-200 font-mono text-xs leading-relaxed">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                <div className="w-3 h-3 rounded-full bg-slate-800"></div>
              </div>
              <div className="text-slate-500">drafting_engine.tsx</div>
            </div>

            <div className="space-y-6">
              {/* System Message */}
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded bg-teal-900/50 border border-teal-800 flex items-center justify-center text-teal-400 font-bold text-[11px] shrink-0">R</div>
                <div>
                  <div className="text-teal-400 font-bold mb-2">Reforma</div>
                  <div className="text-slate-300">
                    I am reviewing the brief for <span className="text-teal-400 bg-teal-400/10 px-1 py-0.5 rounded">Suit CV/2024/005</span>.
                    The lease agreement mentions a guarantor, but the Statement of Claim does not plead against them.
                    <br /><br />
                    Should I add a paragraph pleading joint and several liability for the guarantor?
                  </div>
                </div>
              </div>

              {/* User Message */}
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-bold text-[11px] shrink-0">U</div>
                <div>
                  <div className="text-slate-500 font-bold mb-2">Associate</div>
                  <div className="text-slate-500">
                    Yes, please include it. The guarantor is Mr. Okon.
                  </div>
                </div>
              </div>

              {/* System Action */}
              <div className="pl-10 flex items-center gap-2 text-teal-400/80 italic">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                Drafting Paragraph 14 (Liability of Guarantor)...
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-24 px-6 bg-white border-t border-slate-100 text-center">
        <div className="max-w-[720px] mx-auto reveal">
          <h2 className="text-[2rem] font-bold text-slate-900 mb-6">Build Your Firm's Infrastructure</h2>
          <p className="text-base text-slate-500 mb-10">
            Join the forward-thinking firms scaling their operations with Reforma.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-20">
            {isLoggedIn ? (
              <Link href="/management" className="px-6 py-3 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-all shadow-sm">
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/register" className="px-6 py-3 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-all shadow-sm">
                Get Started
              </Link>
            )}
            <Link href="mailto:sales@reforma.ng" className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-all">
              Contact Sales
            </Link>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <div>© {new Date().getFullYear()} Reforma Digital Solutions Limited.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-slate-600 transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
