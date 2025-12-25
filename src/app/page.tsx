"use client";

import Link from "next/link";
import { ArrowRight, PieChart, Users, Shield, Zap, ChevronRight, LayoutDashboard } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] text-slate-900 selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden">

      {/* Sticky Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Reforma</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link href="/management" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-5 py-2.5 text-slate-600 text-sm font-medium hover:text-slate-900 transition-colors">
                  Log In
                </Link>
                <Link href="/register" className="px-5 py-2.5 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-all shadow-lg shadow-teal-700/20 hover:-translate-y-0.5">
                  Start Building
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-semibold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            The Operating System for Modern Firms
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            The Operational <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">Infrastructure</span> for <br />
            Nigerian Law Firms.
          </h1>

          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Move beyond "institutional memory." Centralize your briefs, automate your finances, and visualize your firm's workload in one premium, secure workspace.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            {isLoggedIn ? (
              <Link href="/management" className="group px-8 py-4 bg-slate-900 text-white rounded-xl font-medium text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2">
                <LayoutDashboard size={20} className="text-teal-400" />
                Go to Dashboard
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform opacity-50" />
              </Link>
            ) : (
              <Link href="/register" className="group px-8 py-4 bg-teal-700 text-white rounded-xl font-medium text-lg transition-all shadow-xl shadow-teal-700/20 hover:shadow-2xl hover:bg-teal-800 hover:-translate-y-1 flex items-center gap-2">
                Deploy Infrastructure
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            <Link href="#manifesto" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-medium text-lg transition-all hover:bg-slate-50 hover:border-slate-300">
              Why Infrastructure?
            </Link>
          </div>
        </div>
      </header>

      {/* Manifesto / Problem Section */}
      <section id="manifesto" className="py-24 px-6 bg-white relative border-y border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="reveal-on-scroll space-y-8 text-center sm:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Is your firm running on <span className="text-teal-700 italic font-serif">hope</span>?
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              Most firms rely on "institutional memory"—what the senior partner knows—and physical files. When a key associate leaves, <strong className="text-slate-900">knowledge walks out the door.</strong>
            </p>
            <p className="text-xl text-slate-600 leading-relaxed">
              Reforma digitizes this backbone. Like the railroads that connect cities, we provide the foundational systems that allow your practice to scale into an institution.
            </p>
          </div>
        </div>
      </section>

      {/* The 3 Pillars */}
      <section className="py-32 px-6 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 reveal-on-scroll">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">The Trinity of Operations</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Three core systems unified into one operating system.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-teal-100 transition-all duration-300 group reveal-on-scroll">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <Shield size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">The Digital Vault</h3>
              <p className="text-slate-500 leading-relaxed">
                <strong className="text-blue-700 block mb-2 text-sm uppercase tracking-wide">Brief Management</strong>
                A secure repository for every case file. Prevent the "Case of the Missing File." Ensure continuity even when staff change.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-teal-100 transition-all duration-300 group reveal-on-scroll delay-100">
              <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <PieChart size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">The Silent CFO</h3>
              <p className="text-slate-500 leading-relaxed">
                <strong className="text-emerald-700 block mb-2 text-sm uppercase tracking-wide">Financial OS</strong>
                Automated invoicing and expense tracking. You don't need a full-time accountant to know exactly where every Naira went.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-teal-100 transition-all duration-300 group reveal-on-scroll delay-200">
              <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">The Partner's Eye</h3>
              <p className="text-slate-500 leading-relaxed">
                <strong className="text-purple-700 block mb-2 text-sm uppercase tracking-wide">Workload & Visibility</strong>
                Who is doing what? And is it done? Gain total transparency into staff capacity and deliverables.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Drafting Studio Feature */}
      <section className="py-24 px-6 bg-[#0f2027] text-white overflow-hidden relative">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>

        <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-2 gap-16 items-center">
          <div className="reveal-on-scroll">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium mb-8">
              <Zap size={14} className="text-yellow-400" /> New Feature
            </div>
            <h2 className="text-4xl font-bold mb-6">The Socratic Drafter</h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              From administration to creation. Reforma isn't just a database; it's an intelligent senior associate.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">1</div>
                <div>
                  <h4 className="font-bold mb-1">It Asks Questions</h4>
                  <p className="text-sm text-slate-400">"Is this a commercial tenancy? Are there guarantors?"</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">2</div>
                <div>
                  <h4 className="font-bold mb-1">It Applies Context</h4>
                  <p className="text-sm text-slate-400">Pulls facts directly from the Brief Manager vault.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">3</div>
                <div>
                  <h4 className="font-bold mb-1">It Drafts Instantly</h4>
                  <p className="text-sm text-slate-400">Generates court-ready Statements of Claim in seconds.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Representation of Drafting */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 shadow-2xl relative reveal-on-scroll delay-200">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-500/20 rounded-full blur-2xl"></div>
            <div className="space-y-4 font-mono text-sm">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-900/50 flex items-center justify-center text-teal-500">AI</div>
                <div className="bg-slate-800 p-3 rounded-lg rounded-tl-none text-slate-300">
                  Based on the facts, I'm drafting the Statement of Claim. Should I include specific damages for the vehicle repair?
                </div>
              </div>
              <div className="flex gap-3 flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400">You</div>
                <div className="bg-teal-900/30 border border-teal-800/50 p-3 rounded-lg rounded-tr-none text-teal-100">
                  Yes, list the repair estimate at ₦2.5M.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-900/50 flex items-center justify-center text-teal-500">AI</div>
                <div className="bg-slate-800 p-3 rounded-lg rounded-tl-none text-slate-300">
                  <span className="animate-pulse">Drafting Paragraph 14...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-24 px-6 bg-white text-center">
        <div className="max-w-3xl mx-auto reveal-on-scroll">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Transform your practice into an institution.</h2>
          <p className="text-lg text-slate-500 mb-10">
            Join the forward-thinking Nigerian firms building their infrastructure with Reforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <Link href="/management" className="px-10 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1">
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/register" className="px-10 py-4 bg-teal-700 text-white rounded-xl font-bold text-lg hover:bg-teal-800 transition-all shadow-xl shadow-teal-700/20 hover:-translate-y-1">
                Start Building Now
              </Link>
            )}
          </div>
          <div className="mt-16 pt-8 border-t border-slate-100 text-sm text-slate-400">
            © {new Date().getFullYear()} Reforma Digital Solutions Limited. Built for the Nigerian Legal Context.
          </div>
        </div>
      </footer>
    </div>
  );
}
