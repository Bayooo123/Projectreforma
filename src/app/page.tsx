"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen text-[#1a1a1a] bg-[#fafafa]" style={{ fontFamily: 'Georgia, serif', lineHeight: 1.6 }}>

      {/* HERO SECTION */}
      <div className="relative text-white py-[120px] px-5 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
        }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.4]"
          style={{
            backgroundImage: `url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><path d="M30 0L60 30L30 60L0 30Z" fill="rgba(255,255,255,0.03)"/></svg>')`
          }}>
        </div>

        <div className="relative z-10 max-w-[900px] mx-auto">
          <h1 className="text-[2.5rem] md:text-[3.5rem] font-light mb-5 tracking-tight">
            Reforma
          </h1>
          <p className="text-[1.2rem] md:text-[1.5rem] italic opacity-95 mb-[15px]">
            Infrastructure, Not Just Software
          </p>
          <p className="text-[1.1rem] md:text-[1.2rem] opacity-90 leading-[1.8] mb-10 max-w-2xl mx-auto">
            The operational backbone for Nigerian law firms—transforming legal practices into enduring institutions
          </p>

          {isLoggedIn ? (
            <Link href="/management" className="inline-block px-[45px] py-[18px] bg-[#c19a6b] text-white rounded-[4px] text-[1.1rem] font-semibold border-2 border-transparent hover:bg-transparent hover:border-[#c19a6b] hover:-translate-y-[2px] transition-all duration-300">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/register" className="inline-block px-[45px] py-[18px] bg-[#c19a6b] text-white rounded-[4px] text-[1.1rem] font-semibold border-2 border-transparent hover:bg-transparent hover:border-[#c19a6b] hover:-translate-y-[2px] transition-all duration-300">
              Request Early Access
            </Link>
          )}
        </div>
      </div>

      {/* PROBLEM / SOLUTION SECTION */}
      <div className="py-[80px] px-5">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[2rem] md:text-[2.5rem] text-center mb-[60px] text-[#0f2027] font-light">
            From Practice to Institution
          </h2>

          <div className="bg-white border-l-4 border-[#c19a6b] p-10 my-10 max-w-[900px] mx-auto shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <h3 className="text-[#c19a6b] text-[1.3rem] mb-[15px] font-bold">The Problem</h3>
            <p>
              Most small-to-mid-sized Nigerian law firms rely on "institutional memory"—what the senior partner knows—and physical files scattered across offices. When a key staff member leaves, critical knowledge walks out the door. The infrastructure isn't in the systems; it's in people's heads.
            </p>
          </div>

          <div className="bg-white border-l-4 border-[#c19a6b] p-10 my-10 max-w-[900px] mx-auto shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <h3 className="text-[#c19a6b] text-[1.3rem] mb-[15px] font-bold">The Solution</h3>
            <p>
              Reforma digitizes your firm's backbone. We are the system that remains constant even as staff evolve. Like the railroads that connect cities or the masts that power communication, we provide the foundation upon which your legal practice can truly scale.
            </p>
          </div>
        </div>
      </div>

      {/* THREE PILLARS SECTION */}
      <div className="py-[80px] px-5 bg-[#f5f5f5]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[2rem] md:text-[2.5rem] text-center mb-[60px] text-[#0f2027] font-light">
            The Three Pillars of Infrastructure
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-[60px]">
            {/* Pillar 1 */}
            <div className="bg-white p-10 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.1)] border-t-4 border-[#2c5364] hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all duration-300">
              <h3 className="text-[1.8rem] text-[#0f2027] mb-[10px] font-normal">Digital Vault</h3>
              <p className="italic text-[#c19a6b] mb-5 text-[1.1rem]">"The firm that remembers everything"</p>
              <p className="mb-[15px] text-[#444] font-bold">Brief Management System</p>
              <p className="text-[#666] text-[0.95rem] leading-[1.7]">
                A centralized, secure repository for every case file, client document, and court process. No more "Case of the Missing File." Any associate can pick up a matter five years later and understand exactly what happened. This is your firm's collective memory—permanent and accessible.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white p-10 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.1)] border-t-4 border-[#2c5364] hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all duration-300">
              <h3 className="text-[1.8rem] text-[#0f2027] mb-[10px] font-normal">Silent CFO</h3>
              <p className="italic text-[#c19a6b] mb-5 text-[1.1rem]">"Managing finances without a specialized hire"</p>
              <p className="mb-[15px] text-[#444] font-bold">Financial Operating System</p>
              <p className="text-[#666] text-[0.95rem] leading-[1.7]">
                Automated invoicing, expense tracking, and revenue monitoring. Most firms cannot justify a full-time CFO or accountant. Reforma automates this role, tracking every Naira from "Billable Hour" to "Bank Account" and giving you a real-time dashboard of your firm's financial health.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white p-10 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.1)] border-t-4 border-[#2c5364] hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all duration-300">
              <h3 className="text-[1.8rem] text-[#0f2027] mb-[10px] font-normal">Command Center</h3>
              <p className="italic text-[#c19a6b] mb-5 text-[1.1rem]">"The Partner's Eye"</p>
              <p className="mb-[15px] text-[#444] font-bold">Workload & Visibility Management</p>
              <p className="text-[#666] text-[0.95rem] leading-[1.7]">
                Task assignment, deadline tracking, and deliverable monitoring. It answers the Managing Partner's most pressing question: "Who is doing what, and is it done?" Gain transparency into staff capacity, prevent burnout, and ensure accountability across every matter.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FUTURE / DRAFTING SECTION */}
      <div className="py-[80px] px-5 text-white"
        style={{ background: 'linear-gradient(135deg, #c19a6b 0%, #8b7355 100%)' }}>
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[2rem] md:text-[2.5rem] text-center mb-[60px] text-white font-light">
            The Future: Intelligent Creation
          </h2>

          <div className="p-10 rounded-lg max-w-[900px] mx-auto border border-white/20 backdrop-blur-md bg-white/10">
            <h3 className="text-[2rem] mb-5 font-light">The Socratic Drafter</h3>
            <p className="text-[1.1rem] mb-5 opacity-95 italic">"From Administration to Creation"</p>
            <p className="mb-5 leading-relaxed">
              While the three pillars handle operations, the Drafting Studio handles production. Instead of merely providing templates, Reforma acts as an intelligent senior associate.
            </p>
            <p className="mb-5 leading-relaxed">
              It asks strategic questions: "Is this a commercial tenancy?" "Are there guarantors?" "What remedies are you seeking?" Then it generates complex legal documents—Statements of Claim, Tenancy Agreements, Contracts—in seconds, pre-filled with context from your Brief Manager.
            </p>
            <p className="leading-relaxed font-medium">
              This is where administration meets law. Where infrastructure enables excellence.
            </p>
          </div>
        </div>
      </div>

      {/* CONTEXT SECTION */}
      <div className="py-[80px] px-5">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[2rem] md:text-[2.5rem] text-center mb-[60px] text-[#0f2027] font-light">
            Built for the Nigerian Context
          </h2>
          <p className="text-center max-w-[800px] mx-auto mb-[50px] text-[1.1rem] text-[#666]">
            Reforma is not a generic Silicon Valley tool adapted for Africa. It is purpose-built for the specific realities of Nigerian legal practice.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px] mt-[40px]">
            <div className="text-center p-[30px] bg-white rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
              <h4 className="text-[#0f2027] mb-[15px] text-[1.3rem] font-bold">Resilient</h4>
              <p className="text-[#666] text-[0.95rem]">Built to work seamlessly with fluctuating internet connectivity. Your practice doesn't stop when the power goes out.</p>
            </div>
            <div className="text-center p-[30px] bg-white rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
              <h4 className="text-[#0f2027] mb-[15px] text-[1.3rem] font-bold">Compliant</h4>
              <p className="text-[#666] text-[0.95rem]">Aligned with Nigerian Bar Association (NBA) standards for record-keeping and professional conduct.</p>
            </div>
            <div className="text-center p-[30px] bg-white rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
              <h4 className="text-[#0f2027] mb-[15px] text-[1.3rem] font-bold">Native</h4>
              <p className="text-[#666] text-[0.95rem]">Uses the language of Nigerian courts—"Statement of Claim," not "Complaint." We speak your legal language.</p>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA & FOOTER */}
      <div className="bg-[#0f2027] text-white text-center py-[80px] px-5">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[2rem] md:text-[2.5rem] mb-5 font-light">Transform Your Practice Into an Institution</h2>
          <p className="text-[1.2rem] mb-10 opacity-90 max-w-3xl mx-auto">
            Reforma OS provides the structure, stability, and intelligence required to scale your law firm from chaotic practice to enduring business institution.
          </p>

          {isLoggedIn ? (
            <Link href="/management" className="inline-block px-[45px] py-[18px] bg-[#c19a6b] text-white rounded-[4px] text-[1.1rem] font-semibold border-2 border-transparent hover:bg-transparent hover:border-[#c19a6b] hover:-translate-y-[2px] transition-all duration-300">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/register" className="inline-block px-[45px] py-[18px] bg-[#c19a6b] text-white rounded-[4px] text-[1.1rem] font-semibold border-2 border-transparent hover:bg-transparent hover:border-[#c19a6b] hover:-translate-y-[2px] transition-all duration-300">
              Schedule a Demo
            </Link>
          )}

          <div className="mt-20 pt-10 border-t border-white/10 text-sm text-white/50">
            &copy; {new Date().getFullYear()} Reforma Digital Solutions Limited. All rights reserved.
          </div>
        </div>
      </div>

    </div>
  );
}
