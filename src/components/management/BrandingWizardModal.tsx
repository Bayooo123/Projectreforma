'use client';

import { useState } from 'react';
import {
    Palette,
    ChevronRight,
    Check,
    Sparkles,
    Shield,
    Gavel,
    CheckCircle2
} from 'lucide-react';
import { completeBranding } from '@/app/actions/settings';

interface BrandingWizardModalProps {
    workspaceId: string;
    workspaceName: string;
    onComplete?: () => void;
}

const PRESET_PALETTES = [
    { name: 'Emerald Trust', main: '#059669', secondary: '#064e3b', accent: '#10b981' },
    { name: 'Classic Corporate', main: '#0f172a', secondary: '#334155', accent: '#10b981' },
    { name: 'Midnight Justice', main: '#1e1b4b', secondary: '#312e81', accent: '#6366f1' },
    { name: 'Slate Integrity', main: '#334155', secondary: '#475569', accent: '#94a3b8' },
];

export default function BrandingWizardModal({ workspaceId, workspaceName, onComplete }: BrandingWizardModalProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [colors, setColors] = useState({
        brandColor: '#059669',
        secondaryColor: '#064e3b',
        accentColor: '#10b981'
    });

    const handlePaletteSelect = (palette: typeof PRESET_PALETTES[0]) => {
        setColors({
            brandColor: palette.main,
            secondaryColor: palette.secondary,
            accentColor: palette.accent
        });
    };

    const handleComplete = async () => {
        setIsSubmitting(true);
        try {
            const result = await completeBranding(workspaceId, colors);
            if (result.success) {
                if (onComplete) onComplete();
                // Force a page reload to apply new CSS variables globally
                window.location.reload();
            } else {
                alert('Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('CRITICAL: completeBranding failed:', error);
            // This return statement is typically for server actions, but if the user intends to add it here,
            // it would mean the handleComplete function itself returns this, which is not standard for a client-side handler.
            // Assuming the user wants to add this for consistency or a future refactor where handleComplete might be a server action.
            // For a client-side handler, this return value would not be used.
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#1e293b] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                            <Sparkles size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Personalize {workspaceName}</h2>
                    </div>
                    <p className="text-slate-400">Welcome to Reforma. Let's set up your firm's visual identity.</p>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-slate-300 font-medium mb-4">
                                <Palette size={18} />
                                <span>Choose a Starting Palette</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {PRESET_PALETTES.map((p) => (
                                    <button
                                        key={p.name}
                                        onClick={() => handlePaletteSelect(p)}
                                        className={`group relative p-4 rounded-xl border transition-all text-left ${colors.brandColor === p.main
                                            ? 'bg-white/10 border-blue-500 shadow-lg shadow-blue-500/10'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-semibold text-white">{p.name}</span>
                                            {colors.brandColor === p.main && (
                                                <div className="bg-blue-500 rounded-full p-0.5">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-8 h-8 rounded-md" style={{ backgroundColor: p.main }} title="Main" />
                                            <div className="w-8 h-8 rounded-md" style={{ backgroundColor: p.secondary }} title="Secondary" />
                                            <div className="w-8 h-8 rounded-md" style={{ backgroundColor: p.accent }} title="Accent" />
                                        </div>
                                    </button>
                                ))}

                                {/* Custom Option Placeholder Style */}
                                <div className="p-4 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-slate-400 text-sm italic">
                                    You can refine these after selecting
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="flex flex-col gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Firm Primary Color (Main Identity)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: colors.brandColor }} />
                                        <input
                                            type="text"
                                            value={colors.brandColor}
                                            onChange={(e) => setColors({ ...colors, brandColor: e.target.value })}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                        <input
                                            type="color"
                                            value={colors.brandColor}
                                            onChange={(e) => setColors({ ...colors, brandColor: e.target.value })}
                                            className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Navigation Color (Sidebar & Header)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: colors.secondaryColor }} />
                                        <input
                                            type="text"
                                            value={colors.secondaryColor}
                                            onChange={(e) => setColors({ ...colors, secondaryColor: e.target.value })}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                        <input
                                            type="color"
                                            value={colors.secondaryColor}
                                            onChange={(e) => setColors({ ...colors, secondaryColor: e.target.value })}
                                            className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Accent Color (Buttons & Highlights)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: colors.accentColor }} />
                                        <input
                                            type="text"
                                            value={colors.accentColor}
                                            onChange={(e) => setColors({ ...colors, accentColor: e.target.value })}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                        <input
                                            type="color"
                                            value={colors.accentColor}
                                            onChange={(e) => setColors({ ...colors, accentColor: e.target.value })}
                                            className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-8 border-t border-white/5 bg-slate-900/50 flex items-center justify-between">
                    <div className="flex gap-1">
                        <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-blue-500' : 'bg-slate-700'}`} />
                        <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-blue-500' : 'bg-slate-700'}`} />
                    </div>

                    <div className="flex gap-4">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-2.5 text-slate-400 hover:text-white transition-colors"
                            >
                                Back
                            </button>
                        )}

                        {step === 1 ? (
                            <button
                                onClick={() => setStep(2)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                            >
                                Next Step
                                <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {isSubmitting ? 'Applying...' : 'Complete Setup'}
                                <CheckCircle2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
