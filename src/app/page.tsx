"use client";

import Link from "next/link";
import { ArrowRight, PieChart, Users, Shield, Zap, LayoutDashboard, CheckCircle2, FileText, Lock } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Scroll Reveal Observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          entry.target.classList.remove('reveal-hidden');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => {
      el.classList.add('reveal-hidden');
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] text-slate-900 selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden">

      {/* 1. Sticky Navigation (Light, Unobtrusive) */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-teal-700 rounded-md flex items-center justify-center text-white font-bold text-sm">R</div>
            <span className="text-sm font-bold tracking-tight text-slate-900 uppercase">Reforma</span>
          </div>
          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <Link href="/management" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2">
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Log In
                </Link>
                <Link href="/register" className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-all">
                  Get Access
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Hero Section (Clear Value Prop, <8s Comprehension) */}
      <header className="relative pt-40 pb-24 px-6 overflow-hidden bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center relative z-10">

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.15]">
            The Operation System for <br />
            <span className="text-teal-700">High-Performance Law Firms</span>
          </h1>

          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Replace scattered spreadsheets and physical files with one secure infrastructure.
            Centralize briefs, automate finances, and track workload in a single workspace.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isLoggedIn ? (
              <Link href="/management" className="group px-6 py-3 bg-teal-700 text-white rounded-lg font-medium text-base transition-all hover:bg-teal-800 shadow-sm flex items-center gap-2">
                <LayoutDashboard size={18} className="text-teal-100" />
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/register" className="group px-6 py-3 bg-teal-700 text-white rounded-lg font-medium text-base transition-all hover:bg-teal-800 shadow-sm flex items-center gap-2">
                Deploy Infrastructure
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform opacity-80" />
              </Link>
            )}
            <Link href="#system" className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium text-base transition-all hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2">
              <Zap size={18} className="text-slate-400" />
              How it works
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 opacity-60 grayscale mix-blend-multiply">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trusted Infrastructure</div>
            {/* Text-based logos for 'Institutional' feel since we don't have SVGs */}
            <span className="text-slate-400 font-serif font-bold italic">LexChambers</span>
            <span className="text-slate-400 font-serif font-bold">ALUKO & CO</span>
            <span className="text-slate-400 font-serif font-bold tracking-widest">TEMPLARS</span>
          </div>
        </div>
      </header>

      {/* 3. Problem / Context (Why it matters) */}
      <section className="py-20 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto text-center reveal-on-scroll">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">The "Institutional Memory" Gap</h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Most firms rely on the memory of senior partners and physical files. When a key associate leaves, critical knowledge is lost.
            Reforma digitizes this backbone, ensuring your firm's intelligence remains properly compounded and accessible.
          </p>
        </div>
      </section>

      {/* 4. Core System Breakdown (3 Pillars) */}
      <section id="system" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* Pillar 1: Briefs */}
            <div className="group reveal-on-scroll">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-6 group-hover:border-teal-100 group-hover:bg-teal-50/50 transition-colors">
                <Shield size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">The Digital Vault</h3>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                Replaces: Physical File Rooms & Shared Drives
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">
                A centralized, immutable repository for every case file. Ensure continuity of service and instant retrieval of historical context.
              </p>
            </div>

            {/* Pillar 2: Finance */}
            <div className="group reveal-on-scroll delay-100">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-6 group-hover:border-teal-100 group-hover:bg-teal-50/50 transition-colors">
                <PieChart size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Financial Operating System</h3>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                Replaces: Excel Spreadsheets & Manual Invoicing
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">
                Automated revenue tracking and expense management. Gain real-time visibility into firm unit economics without a dedicated CFO.
              </p>
            </div>

            {/* Pillar 3: Workload */}
            <div className="group reveal-on-scroll delay-200">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-6 group-hover:border-teal-100 group-hover:bg-teal-50/50 transition-colors">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Partner Command Center</h3>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                Replaces: Weekly Status Meetings & WhatsApp Updates
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">
                Live capacity tracking and deliverable monitoring. Answer "who is doing what" instantly and prevent associate burnout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Flagship Feature Spotlight (Socratic Drafter) */}
      <section className="py-24 px-6 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          <div className="reveal-on-scroll">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-teal-500/30 bg-teal-500/10 text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-6">
              Product Spotlight
            </div>
            <h2 className="text-3xl font-bold mb-4">The Socratic Drafter</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Reforma acts as an intelligent senior associate. It drafts complex legal documents by interrogating the context stored in your Digital Vault.
            </p>

            <ul className="space-y-4">
              <li className="flex gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className="text-teal-500 shrink-0" />
                <span>Pulls client facts directly from case history</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className="text-teal-500 shrink-0" />
                <span>Asks strategic questions to resolve ambiguities</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className="text-teal-500 shrink-0" />
                <span>Generates court-ready documents in seconds</span>
              </li>
            </ul>
          </div>

          {/* UI Metaphor: High-Fidelity Conversational Interface (No Hype) */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 shadow-2xl reveal-on-scroll delay-200 max-w-lg mx-auto w-full font-mono text-xs leading-relaxed">
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
                <div className="w-6 h-6 rounded bg-teal-900/50 border border-teal-800 flex items-center justify-center text-teal-500 font-bold shrink-0">R</div>
                <div className="space-y-2">
                  <div className="text-teal-500 font-bold">Reforma</div>
                  <div className="text-slate-300">
                    I am reviewing the brief for <span className="text-teal-400 bg-teal-400/10 px-1 rounded">Suit CV/2024/005</span>.
                    The lease agreement mentions a guarantor, but the Statement of Claim does not plead against them.
                    <br /><br />
                    Should I add a paragraph pleading joint and several liability for the guarantor?
                  </div>
                </div>
              </div>

              {/* User Message */}
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold shrink-0">U</div>
                <div className="space-y-2">
                  <div className="text-slate-400 font-bold">Associate</div>
                  <div className="text-slate-400">
                    Yes, please include it. The guarantor is Mr. Okon.
                  </div>
                </div>
              </div>

              {/* System Action */}
              <div className="pl-10">
                <div className="inline-flex items-center gap-2 text-teal-500/80 italic">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                  Drafting Paragraph 14 (Liability of Guarantor)...
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. Primary CTA Section */}
      <footer className="py-24 px-6 bg-white border-t border-slate-100 text-center">
        <div className="max-w-2xl mx-auto reveal-on-scroll">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Build Your Firm's Infrastructure</h2>
          <p className="text-base text-slate-500 mb-10">
            Join the forward-thinking firms scaling their operations with Reforma.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {isLoggedIn ? (
              <Link href="/management" className="px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all shadow-sm">
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/register" className="px-8 py-3 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-all shadow-sm">
                Get Started
              </Link>
            )}
            <Link href="mailto:sales@reforma.ng" className="px-8 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-all">
              Contact Sales
            </Link>
          </div>

          <div className="mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <div>© {new Date().getFullYear()} Reforma Digital Solutions Limited.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-600">Privacy Policy</a>
              <a href="#" className="hover:text-slate-600">Terms of Service</a>
              <a href="#" className="hover:text-slate-600">Security</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Global CSS for Reveals */}
      <style jsx global>{`
        .reveal-hidden {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
