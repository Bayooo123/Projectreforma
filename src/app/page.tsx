"use client";

import Link from "next/link";
import { ArrowRight, FileText, PieChart, Users, Shield, Zap, CheckCircle2, ChevronRight, LayoutDashboard } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Simple Scroll Reveal Observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-slate-800 selection:bg-teal-100 selection:text-teal-900 font-[Inter,sans-serif] overflow-x-hidden">

      {/* -- HERO SECTION -- */}
      <header className="relative w-full h-screen min-h-[800px] flex flex-col justify-center items-center overflow-hidden grid-beam-container">
        {/* Background Beam Animation */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="beam-glow top-0 left-0"></div>
        </div>

        <div className="z-10 text-center max-w-4xl px-6 relative reveal-on-scroll reveal-visible">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-600/20 bg-teal-50/50 text-teal-700 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            Reforma OS 1.0
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1] text-gradient">
            The Operational <br />
            <span className="text-gradient-teal">Infrastructure</span> for <br />
            Nigerian Law Firms.
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            Scaling a practice requires more than just hard work. It requires a backbone.
            Manage briefs, finances, and staff workload from <span className="text-slate-900 font-semibold">one centralized workspace</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isLoggedIn ? (
              <Link href="/management" className="group px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-lg transition-all shadow-lg hover:shadow-slate-900/20 hover:-translate-y-1 flex items-center gap-2">
                <LayoutDashboard size={20} className="text-teal-400" />
                Go to Dashboard
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform opacity-50" />
              </Link>
            ) : (
              <Link href="/login" className="group px-8 py-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-medium text-lg transition-all shadow-lg hover:shadow-teal-700/20 hover:-translate-y-1 flex items-center gap-2">
                Deploy Infrastructure
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            <Link href="#manifesto" className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium text-lg transition-all shadow-sm hover:shadow-md">
              Why Infrastructure?
            </Link>
          </div>

          <div className="mt-16 text-slate-400 text-xs font-medium tracking-wide uppercase">
            Built for the Nigerian Legal Context
          </div>
        </div>
      </header>

      {/* -- MANIFESTO SECTION -- */}
      <section id="manifesto" className="py-24 px-6 bg-white border-y border-slate-100 relative">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="reveal-on-scroll">
            <h2 className="text-3xl font-bold mb-6 text-slate-900">Infrastructure is not a buzzword.</h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              When you hear infrastructure, you think of railroads connecting the nation. You think of masts enabling communication.
              <strong className="text-slate-900 block mt-4">At Reforma, infrastructure means structure.</strong>
            </p>
          </div>

          <div className="grid gap-8 reveal-on-scroll">
            <div className="flex gap-4">
              <div className="mt-1 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Preventing Loss</h3>
                <p className="text-slate-500 leading-relaxed">A centralized memory for every document. No more "missing files" when an associate leaves.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                <PieChart size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Financial Control</h3>
                <p className="text-slate-500 leading-relaxed">Managing firm revenue without a specialized CFO hire. Invoices, receipts, and tracking in one place.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 shrink-0">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Partner Visibility</h3>
                <p className="text-slate-500 leading-relaxed">Giving the Managing Partner a live pulse on staff workload and deliverables.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -- BENTO GRID PILLARS -- */}
      <section className="py-32 px-6 bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal-on-scroll">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">The 3 Pillars of Operations</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Reforma unifies the disjointed parts of your practice into a single operating system.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px]">

            {/* Col 1: Briefs (Large) */}
            <div className="md:col-span-2 bento-card p-10 relative group reveal-on-scroll">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-xl mb-6">
                    <Shield size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">The Central Nervous System</h3>
                  <p className="text-slate-500 text-lg leading-relaxed max-w-md">
                    Stop chasing physical files. Centralize your briefs, documents, and client data in one secure vault. Prevent loss. Ensure continuity.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-blue-600 font-medium group-hover:translate-x-2 transition-transform cursor-pointer">
                  Explore Brief Manager <ChevronRight size={18} />
                </div>
              </div>
              {/* Abstract UI representation */}
              <div className="absolute right-[-40px] bottom-[-40px] w-[300px] h-[300px] bg-blue-100/50 rounded-full blur-3xl group-hover:bg-blue-200/50 transition-colors"></div>
            </div>

            {/* Col 2: Finance */}
            <div className="bento-card p-10 relative group reveal-on-scroll">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-xl mb-6">
                    <PieChart size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Financial Backbone</h3>
                  <p className="text-slate-500 leading-relaxed">
                    You don't need a full-time accountant to track billing. Automate invoices and payment tracking.
                  </p>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-full h-32 bg-gradient-to-t from-emerald-50/50 to-transparent"></div>
            </div>

            {/* Col 3: Workload */}
            <div className="bento-card p-10 relative group reveal-on-scroll">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex p-3 bg-purple-50 text-purple-600 rounded-xl mb-6">
                    <Users size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Command Center</h3>
                  <p className="text-slate-500 leading-relaxed">
                    For the Managing Partner who needs to know *who* is doing *what*. Live capacity tracking.
                  </p>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-full h-32 bg-gradient-to-t from-purple-50/50 to-transparent"></div>
            </div>

            {/* Col 4: Drafting Studio (Wide) */}
            <div className="md:col-span-2 bento-card p-10 relative overflow-hidden group reveal-on-scroll bg-slate-900 text-white border-slate-800">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium mb-6">
                    <Zap size={14} className="text-yellow-400" /> New Feature
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Intelligent Drafting Studio</h3>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                    And when you're ready to build... our AI drafting engine sits on top of this infrastructure, turning your organized data into key legal documents in seconds.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button className="px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
                    Try Drafting Studio
                  </button>
                </div>
              </div>

              {/* Decorative Grid */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
              }}></div>
            </div>

          </div>
        </div>
      </section>

      {/* -- FOOTER / CTA -- */}
      <section className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center reveal-on-scroll">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Is your firm running on rails, or hope?</h2>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
            Join the forward-thinking firms building their operational infrastructure with Reforma.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register" className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
              Start Building Now
            </Link>
          </div>
          <p className="mt-8 text-sm text-slate-400">© 2025 Reforma OS. All rights reserved.</p>
        </div>
      </section>

    </div>
  );
}
