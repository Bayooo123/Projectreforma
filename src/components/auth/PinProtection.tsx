'use client';

import { useState, useEffect } from 'react';
import { verifyModulePin, requestModulePinReset, type ProtectedModule } from '@/app/actions/module-pins';
import { Lock, Unlock, Briefcase, ShieldCheck, TrendingUp, Sparkles, Fingerprint, Terminal, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type ProtectionVariant = 'office' | 'compliance' | 'analytics' | 'it' | 'default';

interface PinProtectionProps {
    workspaceId: string;
    children: React.ReactNode;
    title?: string;
    description?: string;
    featureId: string;
    module?: ProtectedModule;
    variant?: ProtectionVariant;
}

export function PinProtection({
    workspaceId,
    children,
    title,
    description,
    featureId,
    module,
    variant = 'default'
}: PinProtectionProps) {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isShaking, setIsShaking] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);

    useEffect(() => {
        async function checkSession() {
            try {
                const stored = sessionStorage.getItem(`rbac_auth_${workspaceId}_${featureId}`);
                if (stored === 'true') {
                    setIsUnlocked(true);
                    setIsLoading(false);
                    return;
                }

                if (module) {
                    // Per-module PIN check
                    const { isModulePinSet } = await import('@/app/actions/module-pins');
                    const pinSet = await isModulePinSet(workspaceId, module);
                    if (!pinSet) setIsUnlocked(true);
                } else {
                    // Legacy: check global adminCode
                    const { isWorkspacePinSet } = await import('@/app/actions/rbac');
                    const isSet = await isWorkspacePinSet(workspaceId);
                    if (!isSet) setIsUnlocked(true);
                }
            } catch {
                setIsUnlocked(true);
            } finally {
                setIsLoading(false);
            }
        }
        checkSession();
    }, [workspaceId, featureId, module]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const result = module
            ? await verifyModulePin(workspaceId, module, pin)
            : await (await import('@/app/actions/rbac')).verifyWorkspacePin(workspaceId, pin);

        if (result.success) {
            setIsUnlocked(true);
            sessionStorage.setItem(`rbac_auth_${workspaceId}_${featureId}`, 'true');
        } else {
            setError(result.error || 'Invalid PIN');
            setPin('');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
    };

    const handleForgotPin = async () => {
        if (!module) return;
        setIsSendingReset(true);
        const result = await requestModulePinReset(workspaceId, module);
        setIsSendingReset(false);
        if (result.success) {
            setResetSent(true);
        } else {
            setError(result.error || 'Could not send reset email');
        }
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'office':
                return {
                    bg: 'bg-gradient-to-br from-slate-50 to-teal-50/30',
                    border: 'border-teal-100',
                    accent: 'text-teal-600',
                    button: 'bg-slate-900 hover:bg-slate-800 shadow-teal-900/10',
                    icon: Briefcase,
                    glow: 'shadow-[0_0_40px_-10px_rgba(20,184,166,0.2)]',
                    title: title || 'Office Management',
                    desc: description || 'Administrative & financial controls restricted to Practice Manager.',
                };
            case 'compliance':
                return {
                    bg: 'bg-gradient-to-br from-slate-50 to-indigo-50/40',
                    border: 'border-indigo-100',
                    accent: 'text-indigo-600',
                    button: 'bg-indigo-900 hover:bg-indigo-800 shadow-indigo-900/20',
                    icon: ShieldCheck,
                    glow: 'shadow-[0_0_40px_-10px_rgba(79,70,229,0.2)]',
                    title: title || 'Internal Audit & Compliance',
                    desc: description || 'Sensitive regulatory data. System-wide clearance required.',
                };
            case 'it':
                return {
                    bg: 'bg-gradient-to-br from-slate-50 to-sky-50/40',
                    border: 'border-sky-100',
                    accent: 'text-sky-600',
                    button: 'bg-sky-900 hover:bg-sky-800 shadow-sky-900/20',
                    icon: Terminal,
                    glow: 'shadow-[0_0_40px_-10px_rgba(14,165,233,0.2)]',
                    title: title || 'IT Management',
                    desc: description || 'System configuration and access controls. Clearance required.',
                };
            case 'analytics':
                return {
                    bg: 'bg-gradient-to-br from-slate-50 via-white to-orange-50/30',
                    border: 'border-orange-100',
                    accent: 'text-orange-500',
                    button: 'bg-gradient-to-r from-slate-900 to-orange-950 hover:opacity-90 shadow-orange-900/10',
                    icon: TrendingUp,
                    glow: 'shadow-[0_0_40px_-10px_rgba(249,115,22,0.2)]',
                    title: title || 'Executive Insights',
                    desc: description || 'Deep financial analytics and firm performance metrics.',
                };
            default:
                return {
                    bg: 'bg-gray-50',
                    border: 'border-gray-100',
                    accent: 'text-tertiary',
                    button: 'bg-slate-900 hover:bg-slate-800',
                    icon: Lock,
                    glow: '',
                    title: title || 'Restricted Access',
                    desc: description || 'Please enter the module PIN to continue.',
                };
        }
    };

    const styles = getVariantStyles();
    const Icon = styles.icon;

    if (isLoading) return null;
    if (isUnlocked) return <>{children}</>;

    return (
        <div className={cn(
            'relative flex flex-col items-center justify-center p-12 rounded-3xl border shadow-xl min-h-[450px] overflow-hidden transition-all duration-500',
            styles.bg,
            styles.border,
            styles.glow
        )}>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/50 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-slate-200/30 rounded-full blur-3xl opacity-50" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 flex flex-col items-center w-full max-w-sm"
            >
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white p-6 rounded-3xl mb-8 shadow-sm border border-border relative group"
                >
                    <Icon className={cn('w-12 h-12 transition-colors duration-300', styles.accent)} />
                    <div className="absolute -top-1 -right-1">
                        <Sparkles className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </motion.div>

                <h3 className="text-2xl font-bold text-primary mb-3 tracking-tight text-center">{styles.title}</h3>
                <p className="text-secondary mb-10 text-center leading-relaxed px-4">{styles.desc}</p>

                {resetSent ? (
                    <div className="w-full text-center">
                        <div className="flex items-center justify-center gap-2 text-teal-600 font-semibold mb-3">
                            <Mail className="w-5 h-5" />
                            Reset link sent to Practice Manager
                        </div>
                        <p className="text-slate-400 text-sm">Check your email and follow the link to set a new PIN.</p>
                    </div>
                ) : (
                    <motion.form
                        onSubmit={handleVerify}
                        animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                        className="w-full flex flex-col gap-4"
                    >
                        <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Fingerprint className="w-5 h-5 text-slate-300" />
                            </div>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="••••"
                                className="w-full pl-12 pr-4 py-4 bg-white border border-border rounded-2xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all text-center tracking-[1em] text-2xl font-bold shadow-inner"
                                maxLength={4}
                                autoFocus
                            />
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-rose-500 text-sm text-center font-semibold"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            className={cn(
                                'w-full text-white font-semibold py-4 px-6 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg',
                                styles.button
                            )}
                        >
                            <Unlock className="w-5 h-5" />
                            Unlock Module
                        </button>

                        {module && (
                            <button
                                type="button"
                                onClick={handleForgotPin}
                                disabled={isSendingReset}
                                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors text-center mt-1 underline underline-offset-2"
                            >
                                {isSendingReset ? 'Sending reset email…' : 'Forgot PIN? Send reset to Practice Manager'}
                            </button>
                        )}
                    </motion.form>
                )}
            </motion.div>
        </div>
    );
}
