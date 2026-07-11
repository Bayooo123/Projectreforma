'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  User, Building2, Lock, Loader, FileText, AlertCircle, Key, Copy, Trash2, Plus, Eye, EyeOff, Check, HardDrive, CreditCard, CheckCircle, Clock, XCircle, Brain, Palette, RotateCcw,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import { updateWorkspaceSettings, getWorkspaceSettings, getStorageUsage, getInstitutionalEmail, claimInstitutionalEmail, getUserTheme, updateUserTheme, updateWorkspaceColors } from '@/app/actions/settings';
import { setModulePin, clearModulePin, getModulePinStatuses, consumeModulePinReset, type ProtectedModule } from '@/app/actions/module-pins';
import { getUserProfile, updateUserProfile } from '@/app/actions/members';
import { getBankAccounts, createBankAccount, deleteBankAccount } from '@/app/actions/bank-accounts';
import { generateApiKey, listApiKeys, revokeApiKey } from '@/app/actions/api-keys';
import { sendPasswordResetFromSettings } from '@/app/actions/auth';
import { getSubscriptionStatus, initiateSubscriptionPayment, checkPaymentStatus, getSubscriptionPayments } from '@/app/actions/subscriptions';
import { BAND_LABELS, TIER_LABELS, SUBSCRIPTION_PRICES, formatNaira, type SubscriptionBand, type SubscriptionTier } from '@/lib/subscriptionPricing';
import styles from './page.module.css';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'profile' | 'firm' | 'appearance' | 'apikeys' | 'security' | 'storage' | 'subscription'>('profile');
    const [mobileSubView, setMobileSubView] = useState<string | null>(null);
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
    const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

    const isMobile = useIsMobile();

    // Config State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Firm Settings
    const [firmCode, setFirmCode] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [letterheadUrl, setLetterheadUrl] = useState('');
    const [brandColor, setBrandColor] = useState('#064e3b');
    // Workspace theme colours (all 3)
    const [editLetterheadUrl, setEditLetterheadUrl] = useState('');
    const [editBrandColor, setEditBrandColor] = useState('#064e3b');
    const [editSecondaryColor, setEditSecondaryColor] = useState('#022c22');
    const [editAccentColor, setEditAccentColor] = useState('#059669');
    // User personal theme
    const [themeSource, setThemeSource] = useState<'workspace' | 'personal'>('workspace');
    const [personalAccentColor, setPersonalAccentColor] = useState('#059669');
    const [personalSecondaryColor, setPersonalSecondaryColor] = useState('#022c22');
    const [personalBrandColor, setPersonalBrandColor] = useState('#064e3b');
    const [isSavingTheme, setIsSavingTheme] = useState(false);
    const [themeSaved, setThemeSaved] = useState(false);
    const [isSavingColors, setIsSavingColors] = useState(false);
    const [colorSaveError, setColorSaveError] = useState<string | null>(null);

    // Institutional Memory Email
    const [institutionalEmail, setInstitutionalEmail] = useState<string | null>(null);
    const [emailHandle, setEmailHandle] = useState('');
    const [isClaimingEmail, setIsClaimingEmail] = useState(false);
    const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Bank Accounts & Job Title
    const [jobTitle, setJobTitle] = useState('');
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [newAccount, setNewAccount] = useState({ bankName: '', accountNumber: '', accountName: '', currency: 'NGN' });
    const [lawyerToken, setLawyerToken] = useState('');

    // API Keys State
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Module PIN State
    const [modulePinStatuses, setModulePinStatuses] = useState<{ office: boolean; it: boolean; compliance: boolean } | null>(null);
    const [modulePinInputs, setModulePinInputs] = useState<Record<string, string>>({ office: '', it: '', compliance: '' });
    const [modulePinSaving, setModulePinSaving] = useState<Record<string, boolean>>({});
    const [modulePinFeedback, setModulePinFeedback] = useState<Record<string, { type: 'success' | 'error'; msg: string }>>({});
    // Reset link flow (from email)
    const [pinResetToken, setPinResetToken] = useState<string | null>(null);
    const [pinResetModule, setPinResetModule] = useState<ProtectedModule | null>(null);
    const [pinResetNewPin, setPinResetNewPin] = useState('');
    const [pinResetResult, setPinResetResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [isConsumingReset, setIsConsumingReset] = useState(false);

    // Storage State
    const [storageData, setStorageData] = useState<any>(null);
    const [isLoadingStorage, setIsLoadingStorage] = useState(false);

    // Subscription State
    const [subscription, setSubscription] = useState<any>(null);
    const [subPayments, setSubPayments] = useState<any[]>([]);
    const [isLoadingSub, setIsLoadingSub] = useState(false);
    const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
    const [selectedBand, setSelectedBand] = useState<SubscriptionBand>('A');
    const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('solo');

    const loadProfile = async () => {
        const res = await getUserProfile();
        if (res.success && res.user) {
            setJobTitle(res.user.jobTitle || '');
            setLawyerToken(res.user.lawyerToken || '');
        }
    };

    const loadApiKeys = async () => {
        if (!session?.user?.id) return;
        const res = await listApiKeys(session.user.id);
        if (res.success && res.data) {
            setApiKeys(res.data);
        }
    };

    const loadSettings = async (workspaceId: string) => {
        setIsLoading(true);
        const [settingsRes, emailRes, accountsRes, userThemeRes] = await Promise.all([
            getWorkspaceSettings(workspaceId),
            getInstitutionalEmail(workspaceId),
            getBankAccounts(workspaceId),
            getUserTheme(),
        ]);

        if (settingsRes.success && settingsRes.workspace) {
            setFirmCode(settingsRes.workspace.firmCode || '');
            setLetterheadUrl(settingsRes.workspace.letterheadUrl || '');
            setEditLetterheadUrl(settingsRes.workspace.letterheadUrl || '');
            const bc = settingsRes.workspace.brandColor || '#064e3b';
            const sc = (settingsRes.workspace as any).secondaryColor || '#022c22';
            const ac = (settingsRes.workspace as any).accentColor || '#059669';
            setBrandColor(bc);
            setEditBrandColor(bc);
            setEditSecondaryColor(sc);
            setEditAccentColor(ac);
        }

        if (emailRes.success) {
            setInstitutionalEmail(emailRes.emailAddress || null);
        }

        if (accountsRes.success && accountsRes.accounts) {
            setBankAccounts(accountsRes.accounts);
        }

        if (userThemeRes.success && userThemeRes.theme) {
            setThemeSource((userThemeRes.theme.themeSource as 'workspace' | 'personal') || 'workspace');
            setPersonalAccentColor(userThemeRes.theme.personalAccentColor || '#059669');
            setPersonalSecondaryColor(userThemeRes.theme.personalSecondaryColor || '#022c22');
            setPersonalBrandColor(userThemeRes.theme.personalBrandColor || '#064e3b');
        }

        setIsLoading(false);
    };

    const loadStorageData = async (workspaceId: string) => {
        setIsLoadingStorage(true);
        const res = await getStorageUsage(workspaceId);
        if (res.success && res.data) {
            setStorageData(res.data);
        }
        setIsLoadingStorage(false);
    };

    const loadSubscription = async (workspaceId: string) => {
        setIsLoadingSub(true);
        const [status, payments] = await Promise.all([
            getSubscriptionStatus(workspaceId),
            getSubscriptionPayments(workspaceId),
        ]);
        setSubscription(status);
        setSubPayments(payments);
        if (status?.subscriptionBand) setSelectedBand(status.subscriptionBand as SubscriptionBand);
        if (status?.subscriptionTier) setSelectedTier(status.subscriptionTier as SubscriptionTier);
        setIsLoadingSub(false);
    };

    const handleInitiatePayment = async () => {
        if (!session?.user?.workspaceId) return;
        setIsInitiatingPayment(true);
        const res = await initiateSubscriptionPayment({
            workspaceId: session.user.workspaceId,
            band: selectedBand,
            tier: selectedTier,
        });
        if (res.success && res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
        } else {
            alert(res.error || 'Failed to initiate payment. Please try again.');
        }
        setIsInitiatingPayment(false);
    };

    useEffect(() => {
        if (session?.user?.workspaceId) {
            loadSettings(session.user.workspaceId);
            loadApiKeys();
            if (activeTab === 'storage') {
                loadStorageData(session.user.workspaceId);
            }
            if (activeTab === 'subscription') {
                loadSubscription(session.user.workspaceId);
            }
            // Load module PIN statuses for PM
            const isPM = session.user.role?.toLowerCase() === 'practice manager' || !!(session.user as any).isPlatformAdmin;
            if (isPM && !modulePinStatuses) {
                getModulePinStatuses(session.user.workspaceId).then(setModulePinStatuses);
            }
        }
        loadProfile();
        // Detect pin reset token in URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('pinReset');
        const mod = params.get('module') as ProtectedModule | null;
        if (token && mod) {
            setPinResetToken(token);
            setPinResetModule(mod);
            setActiveTab('security');
            setMobileSubView('security');
        }
    }, [session, activeTab]);

    const handleSaveJobTitle = async () => {
        setIsSaving(true);
        const res = await updateUserProfile({ jobTitle });
        if (res.success) {
            alert('Profile updated!');
        } else {
            alert('Failed to update profile.');
        }
        setIsSaving(false);
    };

    const handleCreateBankAccount = async () => {
        if (!newAccount.bankName || !newAccount.accountNumber) return;
        setIsSaving(true);
        const res = await createBankAccount(newAccount);
        if (res.success && res.account) {
            setBankAccounts([res.account, ...bankAccounts]);
            setNewAccount({ bankName: '', accountNumber: '', accountName: '', currency: 'NGN' });
        }
        setIsSaving(false);
    };

    const handleDeleteAccount = async (id: string) => {
        await deleteBankAccount(id);
        setBankAccounts(bankAccounts.filter(a => a.id !== id));
    };

    const handleGenerateApiKey = async () => {
        if (!newKeyName.trim() || !session?.user?.id || !session?.user?.workspaceId) return;
        setIsGenerating(true);
        const res = await generateApiKey(
            session.user.id,
            session.user.workspaceId,
            newKeyName.trim(),
            365 // 1 year expiry
        );
        if (res.success && res.data) {
            setGeneratedKey(res.data.key);
            setNewKeyName('');
            loadApiKeys();
        } else {
            alert('Failed to generate API key');
        }
        setIsGenerating(false);
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!session?.user?.id) return;
        const res = await revokeApiKey(keyId, session.user.id);
        if (res.success) {
            loadApiKeys();
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const handleClaimEmail = async () => {
        if (!emailHandle.trim() || !session?.user?.workspaceId) return;
        setIsClaimingEmail(true);
        setEmailFeedback(null);
        const res = await claimInstitutionalEmail(session.user.workspaceId, emailHandle.trim());
        if (res.success && res.emailAddress) {
            setInstitutionalEmail(res.emailAddress);
            setEmailHandle('');
            setEmailFeedback({ type: 'success', message: `Claimed! Your address is ${res.emailAddress}` });
        } else {
            setEmailFeedback({ type: 'error', message: res.error || 'Failed to claim handle.' });
        }
        setIsClaimingEmail(false);
    };

    const handleSaveFirmSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user?.workspaceId) return;
        setIsSaving(true);
        const result = await updateWorkspaceSettings(session.user.workspaceId, {
            letterheadUrl: editLetterheadUrl,
            firmCode: firmCode || null,
            joinPassword: joinPassword || undefined,
            brandColor: editBrandColor,
            secondaryColor: editSecondaryColor,
            accentColor: editAccentColor,
        });
        if (result.success) {
            setJoinPassword('');
            setLetterheadUrl(editLetterheadUrl);
            setBrandColor(editBrandColor);
            alert('Firm settings saved! Reload the page to see theme changes.');
        }
        setIsSaving(false);
    };

    const handleSaveUserTheme = async () => {
        setIsSavingTheme(true);
        const res = await updateUserTheme({
            themeSource,
            personalAccentColor: themeSource === 'personal' ? personalAccentColor : null,
            personalSecondaryColor: themeSource === 'personal' ? personalSecondaryColor : null,
            personalBrandColor: themeSource === 'personal' ? personalBrandColor : null,
        });
        setIsSavingTheme(false);
        if (res.success) {
            setThemeSaved(true);
            setTimeout(() => { setThemeSaved(false); window.location.reload(); }, 1200);
        }
    };

    const handleSendResetLink = async () => {
        setIsSendingReset(true);
        setResetFeedback(null);
        const res = await sendPasswordResetFromSettings();
        setResetFeedback(
            res.success
                ? { type: 'success', message: res.message || 'Reset link sent.' }
                : { type: 'error', message: res.error || 'Failed to send reset link.' }
        );
        setIsSendingReset(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
                method: 'POST',
                body: file,
            });

            if (!res.ok) throw new Error('Upload failed');
            const blob = await res.json();
            setEditLetterheadUrl(blob.url);
        } catch (error) {
            console.error(error);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveModulePin = async (module: ProtectedModule) => {
        const wid = session?.user?.workspaceId;
        if (!wid) return;
        const pin = modulePinInputs[module];
        if (!/^\d{4}$/.test(pin)) {
            setModulePinFeedback(prev => ({ ...prev, [module]: { type: 'error', msg: 'PIN must be exactly 4 digits' } }));
            return;
        }
        setModulePinSaving(prev => ({ ...prev, [module]: true }));
        const result = await setModulePin(wid, module, pin);
        setModulePinSaving(prev => ({ ...prev, [module]: false }));
        if (result.success) {
            setModulePinStatuses(prev => prev ? { ...prev, [module]: true } : null);
            setModulePinInputs(prev => ({ ...prev, [module]: '' }));
            setModulePinFeedback(prev => ({ ...prev, [module]: { type: 'success', msg: 'PIN set successfully' } }));
        } else {
            setModulePinFeedback(prev => ({ ...prev, [module]: { type: 'error', msg: result.error || 'Failed' } }));
        }
    };

    const handleClearModulePin = async (module: ProtectedModule) => {
        const wid = session?.user?.workspaceId;
        if (!wid) return;
        const result = await clearModulePin(wid, module);
        if (result.success) {
            setModulePinStatuses(prev => prev ? { ...prev, [module]: false } : null);
            setModulePinFeedback(prev => ({ ...prev, [module]: { type: 'success', msg: 'PIN removed — module now open' } }));
        }
    };

    const handleConsumeReset = async () => {
        if (!pinResetToken || !pinResetModule) return;
        if (!/^\d{4}$/.test(pinResetNewPin)) {
            setPinResetResult({ type: 'error', msg: 'PIN must be exactly 4 digits' });
            return;
        }
        setIsConsumingReset(true);
        const result = await consumeModulePinReset(pinResetToken, pinResetNewPin);
        setIsConsumingReset(false);
        if (result.success) {
            setPinResetResult({ type: 'success', msg: 'PIN has been reset successfully.' });
            setPinResetToken(null);
            setPinResetModule(null);
            // Clear URL params
            window.history.replaceState({}, '', '/settings?tab=security');
        } else {
            setPinResetResult({ type: 'error', msg: result.error || 'Reset failed' });
        }
    };

    const handleSaveColors = async () => {
        if (!session?.user?.workspaceId) return;
        setIsSavingColors(true);
        setColorSaveError(null);
        const result = await updateWorkspaceColors(session.user.workspaceId, {
            accentColor: editAccentColor,
            secondaryColor: editSecondaryColor,
            brandColor: editBrandColor,
        });
        setIsSavingColors(false);
        if (result.success) {
            setTimeout(() => window.location.reload(), 300);
        } else {
            setColorSaveError(result.error || 'Failed to save colours');
        }
    };

    // Only Practice Managers (and platform admins) can set workspace-wide colours
    const canEditWorkspaceColors =
        session?.user?.role?.toLowerCase() === 'practice manager' ||
        !!(session?.user as any)?.isPlatformAdmin;

    // Check if user can manage API keys (owner/partner only)
    const canManageApiKeys = session?.user?.role === 'owner' || session?.user?.role === 'partner';

    if (isLoading && !session) return <div className={styles.loading}><Loader className="spin" /> Loading...</div>;

    const categories = [
        { id: 'profile', name: 'Profile Information', desc: 'Job title, name, and personal details', icon: User, bg: '#EFF6FF', color: '#2563EB' },
        { id: 'firm', name: 'Firm Configuration', desc: 'Branding, join password, and bank accounts', icon: Building2, bg: '#ECFDF5', color: '#059669' },
        { id: 'appearance', name: 'Appearance Override', desc: 'Customize accents and theme settings', icon: Palette, bg: '#F5F3FF', color: '#7C3AED' },
        ...(canManageApiKeys ? [{ id: 'apikeys', name: 'API Integrations', desc: 'Generate keys for external developer access', icon: Key, bg: '#FEF3C7', color: '#D97706' }] : []),
        { id: 'security', name: 'Security & PIN Gates', desc: 'Password reset and screen locks', icon: Lock, bg: '#FEF2F2', color: '#EF4444' },
        { id: 'storage', name: 'Disk Storage', desc: 'Breakdown of workspace documents size', icon: HardDrive, bg: '#F0F9FF', color: '#0891b2' },
        { id: 'subscription', name: 'Workspace Plan', desc: 'Manage invoices, tier levels, and billing info', icon: CreditCard, bg: '#FFFBEB', color: '#B45309' }
    ];

    if (isMobile && !mobileSubView) {
        return (
            <div className="rm-screen" style={{ background: '#F1F5F9', minHeight: '100vh' }}>
                <div className="rm-hdr" style={{ borderBottom: '1px solid #E2E8F0', background: '#F1F5F9' }}>
                    <p className="rm-eyebrow">Workspace</p>
                    <h1 className="rm-h1">Settings</h1>
                </div>
                <div className="rm-scroll" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                        Manage your personal profile, firm preferences, and integrations.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setActiveTab(cat.id as any);
                                    setMobileSubView(cat.id);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '16px',
                                    background: '#fff',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(15,23,42,.04)',
                                    textAlign: 'left',
                                    width: '100%',
                                }}
                            >
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '12px',
                                    background: cat.bg,
                                    color: cat.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <cat.icon size={20} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '14.5px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{cat.name}</p>
                                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</p>
                                </div>
                                <ChevronRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <><div className={isMobile ? "rm-screen" : styles.container} style={isMobile ? { background: '#F1F5F9', minHeight: '100vh' } : undefined}>
            {isMobile ? (
                <div style={{
                    padding: '14px 16px',
                    background: '#F1F5F9',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <button
                        onClick={() => setMobileSubView(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--accent-color, #059669)',
                            fontSize: '14px',
                            fontWeight: 600,
                            padding: '4px 0',
                        }}
                    >
                        <ChevronLeft size={16} /> Back
                    </button>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                        {categories.find(c => c.id === mobileSubView)?.name || 'Settings'}
                    </span>
                </div>
            ) : (
                <header className={styles.header}>
                    <h1>Settings</h1>
                    <p>Manage your personal profile, firm preferences, and integrations.</p>
                </header>
            )}

            {!isMobile && (
                <div className={styles.tabsContainer}>
                    <div className={styles.tabs}>
                        <button className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`} onClick={() => setActiveTab('profile')}>
                            <User size={18} /> Profile
                        </button>
                        <button className={`${styles.tab} ${activeTab === 'firm' ? styles.activeTab : ''}`} onClick={() => setActiveTab('firm')}>
                            <Building2 size={18} /> Firm
                        </button>
                        <button className={`${styles.tab} ${activeTab === 'appearance' ? styles.activeTab : ''}`} onClick={() => setActiveTab('appearance')}>
                            <Palette size={18} /> Appearance
                        </button>
                        {canManageApiKeys && (
                            <button className={`${styles.tab} ${activeTab === 'apikeys' ? styles.activeTab : ''}`} onClick={() => setActiveTab('apikeys')}>
                                <Key size={18} /> API Keys
                            </button>
                        )}
                        <button className={`${styles.tab} ${activeTab === 'security' ? styles.activeTab : ''}`} onClick={() => setActiveTab('security')}>
                            <Lock size={18} /> Security
                        </button>
                        <button className={`${styles.tab} ${activeTab === 'storage' ? styles.activeTab : ''}`} onClick={() => setActiveTab('storage')}>
                            <HardDrive size={18} /> Storage
                        </button>
                        <button className={`${styles.tab} ${activeTab === 'subscription' ? styles.activeTab : ''}`} onClick={() => setActiveTab('subscription')}>
                            <CreditCard size={18} /> Subscription
                        </button>
                    </div>
                </div>
            )}

            <div className={isMobile ? "rm-scroll" : styles.content} style={isMobile ? { padding: '16px 0 32px' } : undefined}>
                {activeTab === 'profile' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <User className={styles.icon} />
                            <h2>Personal Information</h2>
                        </div>
                        <div className={styles.infoRow}>
                            <label>Full Name</label>
                            <input type="text" disabled value={session?.user?.name || ''} className={styles.input} />
                        </div>
                        <div className={styles.infoRow}>
                            <label>Email Address</label>
                            <input type="email" disabled value={session?.user?.email || ''} className={styles.input} />
                        </div>
                        <div className={styles.infoRow}>
                            <label>Job Title / Designation</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    placeholder="e.g. Senior Advocate, Associate Partner"
                                />
                                <button className={styles.inlineSaveBtn} onClick={handleSaveJobTitle} disabled={isSaving}>Save</button>
                            </div>
                            <p className={styles.hint}>This will appear below your name on invoices you sign.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'firm' && (
                    <>
                        {/* Firm Branding Card */}
                        <form className={styles.card} onSubmit={handleSaveFirmSettings}>
                            <div className={styles.cardHeader}>
                                <Building2 className={styles.icon} />
                                <h2>Branding & Identity</h2>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Firm Code</label>
                                <input 
                                    type="text" 
                                    className={styles.input} 
                                    value={firmCode} 
                                    onChange={e => setFirmCode(e.target.value)} 
                                    placeholder="e.g. ASCOLP"
                                />
                                <p className={styles.hint}>Used by team members to find your practice during registration.</p>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Join Password (Optional)</label>
                                <input 
                                    type="password" 
                                    className={styles.input} 
                                    value={joinPassword} 
                                    onChange={e => setJoinPassword(e.target.value)} 
                                    placeholder="Leave blank to keep current"
                                />
                                <p className={styles.hint}>Password required for new members to join using the firm code above.</p>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Letterhead / Branding File</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {editLetterheadUrl && (
                                            <div style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', maxWidth: '300px' }}>
                                                {editLetterheadUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                                                    <img src={editLetterheadUrl} alt="Letterhead" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }} />
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
                                                        <FileText size={20} />
                                                        <span style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{editLetterheadUrl.split('/').pop()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="file"
                                                accept="image/*,.pdf,.doc,.docx"
                                                onChange={handleFileUpload}
                                                disabled={isSaving || isUploading}
                                                style={{ display: 'block', width: '100%' }}
                                            />
                                            <input
                                                type="text"
                                                className={styles.input}
                                                value={editLetterheadUrl}
                                                onChange={e => setEditLetterheadUrl(e.target.value)}
                                                placeholder="Or paste URL..."
                                                style={{ marginTop: '0.5rem' }}
                                            />
                                        </div>
                                        {isUploading && <Loader className="spin" size={20} />}
                                    </div>
                                    {!editLetterheadUrl?.match(/\.(jpeg|jpg|png|gif)$/i) && editLetterheadUrl && (
                                        <div style={{ fontSize: '0.8rem', color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <AlertCircle size={14} />
                                            <span>
                                                Note: PDF/Word letterheads cannot be automatically placed on generated invoices.
                                                Please upload an Image (PNG/JPG) for logo placement, or use these files as reference.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.actions}>
                                <button type="submit" className={styles.saveBtn} disabled={isSaving}>Save Configuration</button>
                            </div>
                        </form>

                        {/* Workspace Colour Card — Practice Manager only */}
                        {canEditWorkspaceColors && (
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <Palette className={styles.icon} />
                                    <h2>Workspace Colours</h2>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                    Set the colour scheme for the entire workspace. Changes apply to all team members immediately on reload.
                                </p>

                                {/* Live preview */}
                                <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                                        Preview
                                    </div>
                                    <div style={{ display: 'flex', height: 80 }}>
                                        <div style={{ width: 48, background: editSecondaryColor, display: 'flex', flexDirection: 'column', gap: 6, padding: 8, alignItems: 'center' }}>
                                            {[editAccentColor, '#ffffff55', '#ffffff33'].map((c, i) => (
                                                <div key={i} style={{ width: 24, height: 6, borderRadius: 99, background: c }} />
                                            ))}
                                        </div>
                                        <div style={{ flex: 1, background: '#f8fafc', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <div style={{ width: 50, height: 14, borderRadius: 4, background: editAccentColor }} />
                                                <div style={{ width: 30, height: 14, borderRadius: 4, background: '#e2e8f0' }} />
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <div style={{ width: 60, height: 28, borderRadius: 5, background: editAccentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>Button</span>
                                                </div>
                                                <div style={{ width: 28, height: 28, borderRadius: 5, border: `1.5px solid ${editAccentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: 9, color: editAccentColor, fontWeight: 700 }}>Alt</span>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 9, color: editBrandColor, fontWeight: 600 }}>Brand text · Link colour</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <ColorPicker
                                        label="Primary (Buttons & Links)"
                                        hint="Used for buttons, active nav links, and primary actions"
                                        value={editAccentColor}
                                        onChange={setEditAccentColor}
                                        presets={['#059669','#3182ce','#0057B8','#7c3aed','#dc2626','#d97706','#C8922A','#0891b2']}
                                    />
                                    <ColorPicker
                                        label="Sidebar Background"
                                        hint="Navigation sidebar colour — usually a dark shade"
                                        value={editSecondaryColor}
                                        onChange={setEditSecondaryColor}
                                        presets={['#022c22','#064e3b','#0f172a','#1e293b','#1A1208','#1a1a2e','#18181b','#3730a3']}
                                    />
                                    <ColorPicker
                                        label="Brand Text"
                                        hint="Used for headings and brand-coloured text elements"
                                        value={editBrandColor}
                                        onChange={setEditBrandColor}
                                        presets={['#065f46','#1e40af','#6d28d9','#9a3412','#7A5610','#0369a1','#374151','#121826']}
                                    />
                                </div>

                                {colorSaveError && (
                                    <p style={{ fontSize: '0.85rem', color: '#dc2626', marginBottom: '0.75rem' }}>{colorSaveError}</p>
                                )}
                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        className={styles.saveBtn}
                                        onClick={handleSaveColors}
                                        disabled={isSavingColors}
                                    >
                                        {isSavingColors ? 'Saving…' : 'Apply Colours'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Institutional Memory Card */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Brain className={styles.icon} />
                                <h2>Institutional Memory</h2>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                BCC this address on client emails to automatically capture them into your firm&apos;s institutional memory.
                                Every email you BCC will be routed into the correct brief.
                            </p>

                            {institutionalEmail ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <code style={{ flex: 1, fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.01em' }}>
                                            {institutionalEmail}
                                        </code>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(institutionalEmail); alert('Copied!'); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}
                                            title="Copy to clipboard"
                                        >
                                            <Copy size={18} />
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        Add this to the BCC field on every client email. Team members can also save it as a contact for quick access.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface)' }}>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="yourfirm"
                                                value={emailHandle}
                                                onChange={e => setEmailHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                style={{ flex: 1, border: 'none', background: 'transparent', paddingRight: 0 }}
                                            />
                                            <span style={{ padding: '0 0.75rem', color: 'var(--text-tertiary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>@reforma.ng</span>
                                        </div>
                                        <button
                                            onClick={handleClaimEmail}
                                            disabled={!emailHandle.trim() || isClaimingEmail}
                                            className={styles.saveBtn}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                                        >
                                            {isClaimingEmail ? <><Loader className="spin" size={16} /> Claiming…</> : 'Claim Address'}
                                        </button>
                                    </div>
                                    {emailFeedback && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: emailFeedback.type === 'error' ? '#ef4444' : '#10b981' }}>
                                            {emailFeedback.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
                                            {emailFeedback.message}
                                        </div>
                                    )}
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        Once claimed, this address belongs to your firm permanently.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Bank Accounts Card */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Building2 className={styles.icon} />
                                <h2>Firm Bank Accounts</h2>
                            </div>

                            <div className={styles.accountList}>
                                {bankAccounts.map(account => (
                                    <div key={account.id} className={styles.accountItem}>
                                        <div>
                                            <strong>{account.bankName}</strong> ({account.currency})
                                            <div className={styles.accountDetail}>{account.accountNumber} - {account.accountName}</div>
                                        </div>
                                        <button onClick={() => setDeletingAccountId(account.id)} className={styles.removeBtn}>Remove</button>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.addAccountForm}>
                                <h3>Add New Account</h3>
                                <div className={styles.gridRow}>
                                    <input placeholder="Bank Name (e.g. GTBank)" value={newAccount.bankName} onChange={e => setNewAccount({ ...newAccount, bankName: e.target.value })} className={styles.input} />
                                    <input placeholder="Account Number" value={newAccount.accountNumber} onChange={e => setNewAccount({ ...newAccount, accountNumber: e.target.value })} className={styles.input} />
                                </div>
                                <div className={styles.gridRow}>
                                    <input placeholder="Account Name (e.g. ASCO LP)" value={newAccount.accountName} onChange={e => setNewAccount({ ...newAccount, accountName: e.target.value })} className={styles.input} />
                                    <select value={newAccount.currency} onChange={e => setNewAccount({ ...newAccount, currency: e.target.value })} className={styles.select}>
                                        <option value="NGN">NGN (₦)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                                <button onClick={handleCreateBankAccount} className={styles.secondaryBtn} disabled={isSaving}>Add Bank Account</button>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'appearance' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <Palette className={styles.icon} />
                            <h2>Personal Appearance</h2>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Override your firm&apos;s workspace theme with personal colours. Only you will see these changes.
                        </p>

                        {/* Theme source toggle */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem' }}>
                            {(['workspace', 'personal'] as const).map(src => (
                                <button
                                    key={src}
                                    type="button"
                                    onClick={() => setThemeSource(src)}
                                    style={{
                                        flex: 1, padding: '0.875rem 1rem',
                                        border: `2px solid ${themeSource === src ? 'var(--primary)' : 'var(--border)'}`,
                                        borderRadius: '10px', background: themeSource === src ? 'var(--primary-bg)' : 'var(--surface)',
                                        cursor: 'pointer', textAlign: 'left',
                                    }}
                                >
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: themeSource === src ? 'var(--primary-text)' : 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                        {src === 'workspace' ? 'Workspace Default' : 'Personal Theme'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {src === 'workspace'
                                            ? 'Use the colours configured by your workspace admin'
                                            : 'Set your own colour preferences, visible only to you'}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {themeSource === 'personal' && (
                            <>
                                {/* Personal preview */}
                                <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                                        Your personal preview
                                    </div>
                                    <div style={{ display: 'flex', height: 80 }}>
                                        <div style={{ width: 48, background: personalSecondaryColor, display: 'flex', flexDirection: 'column', gap: 6, padding: 8, alignItems: 'center' }}>
                                            {[personalAccentColor, '#ffffff55', '#ffffff33'].map((c, i) => (
                                                <div key={i} style={{ width: 24, height: 6, borderRadius: 99, background: c }} />
                                            ))}
                                        </div>
                                        <div style={{ flex: 1, background: '#f8fafc', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <div style={{ width: 60, height: 26, borderRadius: 5, background: personalAccentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>Button</span>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 9, color: personalBrandColor, fontWeight: 600 }}>Brand text · Link colour</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <ColorPicker
                                        label="Primary Colour"
                                        hint="Buttons and active elements"
                                        value={personalAccentColor}
                                        onChange={setPersonalAccentColor}
                                        presets={['#059669','#3182ce','#0057B8','#7c3aed','#dc2626','#d97706','#0891b2','#475569']}
                                    />
                                    <ColorPicker
                                        label="Sidebar Colour"
                                        hint="Navigation sidebar background"
                                        value={personalSecondaryColor}
                                        onChange={setPersonalSecondaryColor}
                                        presets={['#022c22','#064e3b','#0f172a','#1e293b','#0A2342','#1a1a2e','#18181b','#3730a3']}
                                    />
                                    <ColorPicker
                                        label="Brand Text"
                                        hint="Headings and branded text"
                                        value={personalBrandColor}
                                        onChange={setPersonalBrandColor}
                                        presets={['#065f46','#1e40af','#6d28d9','#9a3412','#D4AF37','#0369a1','#374151','#121826']}
                                    />
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button
                                onClick={handleSaveUserTheme}
                                disabled={isSavingTheme || themeSaved}
                                className={styles.saveBtn}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {isSavingTheme
                                    ? <><Loader className="spin" size={16} /> Saving…</>
                                    : themeSaved
                                        ? <><Check size={16} /> Saved — reloading</>
                                        : 'Save Appearance'
                                }
                            </button>
                            {themeSource === 'personal' && (
                                <button
                                    type="button"
                                    onClick={() => { setThemeSource('workspace'); handleSaveUserTheme(); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', fontSize: '0.875rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                >
                                    <RotateCcw size={14} /> Reset to workspace default
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'apikeys' && canManageApiKeys && (
                    <>
                        {/* Generated Key Alert */}
                        {generatedKey && (
                            <div className={styles.card} style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                <div className={styles.cardHeader}>
                                    <Key className={styles.icon} style={{ color: '#10B981' }} />
                                    <h2 style={{ color: '#10B981' }}>API Key Generated!</h2>
                                </div>
                                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                    Copy this key now. It will not be shown again.
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--surface)', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace' }}>
                                    <code style={{ flex: 1, wordBreak: 'break-all', fontSize: '0.9rem' }}>
                                        {showKey ? generatedKey : '•'.repeat(40)}
                                    </code>
                                    <button onClick={() => setShowKey(!showKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                    <button onClick={() => copyToClipboard(generatedKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                                        <Copy size={18} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setGeneratedKey(null)}
                                    style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                >
                                    I&apos;ve saved the key
                                </button>
                            </div>
                        )}

                        {/* Generate New Key */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Key className={styles.icon} />
                                <h2>API Keys</h2>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Generate API keys for external integrations like Bica. Keys are scoped to this workspace.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Key name (e.g. Bica Integration)"
                                    value={newKeyName}
                                    onChange={e => setNewKeyName(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    onClick={handleGenerateApiKey}
                                    disabled={!newKeyName.trim() || isGenerating}
                                    className={styles.saveBtn}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {isGenerating ? <Loader className="spin" size={16} /> : <Plus size={16} />}
                                    Generate
                                </button>
                            </div>

                            {/* Existing Keys */}
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Active Keys</h3>
                            {apiKeys.length === 0 ? (
                                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>No API keys generated yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {apiKeys.map(key => (
                                        <div key={key.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem 1rem',
                                            background: 'var(--surface)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{key.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                    {key.keyPrefix}••••••••
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                                    Created: {new Date(key.createdAt).toLocaleDateString()}
                                                    {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setRevokingKeyId(key.id)}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: 'none',
                                                    padding: '0.5rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: '#EF4444'
                                                }}
                                                title="Revoke key"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
                {activeTab === 'security' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <Lock className={styles.icon} />
                            <h2>Security Settings</h2>
                        </div>

                        <div className={styles.resetSection}>
                            <div className={styles.resetDescription}>
                                <h3 className={styles.resetTitle}>Change Password</h3>
                                <p className={styles.resetText}>
                                    We&apos;ll send a secure password reset link to your account email address.
                                    Click the link in the email to set a new password — no old password required.
                                </p>
                                <div className={styles.resetEmailRow}>
                                    <span className={styles.resetEmailLabel}>Reset link will be sent to</span>
                                    <span className={styles.resetEmailValue}>{session?.user?.email || '—'}</span>
                                </div>
                            </div>

                            {resetFeedback && (
                                <div className={resetFeedback.type === 'error' ? styles.error : styles.success}>
                                    {resetFeedback.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                                    {resetFeedback.message}
                                </div>
                            )}

                            <button
                                onClick={handleSendResetLink}
                                disabled={isSendingReset || resetFeedback?.type === 'success'}
                                className={styles.saveBtn}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}
                            >
                                {isSendingReset
                                    ? <><Loader className="spin" size={16} /> Sending…</>
                                    : resetFeedback?.type === 'success'
                                        ? <><Check size={16} /> Link Sent</>
                                        : 'Send Password Reset Link'
                                }
                            </button>

                            {resetFeedback?.type === 'success' && (
                                <button
                                    onClick={() => setResetFeedback(null)}
                                    className={styles.secondaryBtn}
                                    style={{ marginTop: '0.75rem' }}
                                >
                                    Send again
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'security' && (pinResetToken && pinResetModule) && (
                    <div className={styles.card} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.cardHeader}>
                            <Key className={styles.icon} />
                            <h2>Set New {pinResetModule === 'office' ? 'Office Manager' : pinResetModule === 'it' ? 'IT Management' : 'Compliance'} PIN</h2>
                        </div>
                        <div className={styles.resetSection}>
                            <p className={styles.resetText}>Enter a new 4-digit PIN for this module.</p>
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={pinResetNewPin}
                                onChange={e => setPinResetNewPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="New 4-digit PIN"
                                className={styles.input}
                                style={{ maxWidth: 160, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem', marginTop: '1rem' }}
                            />
                            {pinResetResult && (
                                <div className={pinResetResult.type === 'error' ? styles.error : styles.success} style={{ marginTop: '0.75rem' }}>
                                    {pinResetResult.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                                    {pinResetResult.msg}
                                </div>
                            )}
                            {pinResetResult?.type !== 'success' && (
                                <button onClick={handleConsumeReset} disabled={isConsumingReset} className={styles.saveBtn} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {isConsumingReset ? <><Loader className="spin" size={16} /> Saving…</> : 'Save New PIN'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'security' && (
                    (() => {
                        const isPM = session?.user?.role?.toLowerCase() === 'practice manager' || !!(session?.user as any)?.isPlatformAdmin;
                        if (!isPM) return null;
                        const modules: { key: ProtectedModule; label: string }[] = [
                            { key: 'office', label: 'Office Manager' },
                            { key: 'it', label: 'IT Management' },
                            { key: 'compliance', label: 'Compliance' },
                        ];
                        return (
                            <div className={styles.card} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.cardHeader}>
                                    <Key className={styles.icon} />
                                    <h2>Module Access PINs</h2>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.5rem' }}>
                                    Set a 4-digit PIN for each protected module. Users will be prompted to enter the PIN before gaining access. Leave a module without a PIN to keep it open.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {modules.map(({ key, label }) => (
                                        <div key={key} style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                                                <span style={{
                                                    fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                                                    background: modulePinStatuses?.[key] ? '#dcfce7' : '#f1f5f9',
                                                    color: modulePinStatuses?.[key] ? '#16a34a' : 'var(--text-secondary)',
                                                }}>
                                                    {modulePinStatuses?.[key] ? 'PIN Active' : 'No PIN'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    maxLength={4}
                                                    value={modulePinInputs[key]}
                                                    onChange={e => setModulePinInputs(prev => ({ ...prev, [key]: e.target.value.replace(/\D/g, '') }))}
                                                    placeholder={modulePinStatuses?.[key] ? 'New PIN' : 'Set PIN'}
                                                    className={styles.input}
                                                    style={{ maxWidth: 120, letterSpacing: '0.3em', textAlign: 'center' }}
                                                />
                                                <button
                                                    onClick={() => handleSaveModulePin(key)}
                                                    disabled={modulePinSaving[key]}
                                                    className={styles.saveBtn}
                                                    style={{ padding: '0.5rem 1rem', fontSize: 13 }}
                                                >
                                                    {modulePinSaving[key] ? <Loader className="spin" size={14} /> : modulePinStatuses?.[key] ? 'Change PIN' : 'Set PIN'}
                                                </button>
                                                {modulePinStatuses?.[key] && (
                                                    <button
                                                        onClick={() => handleClearModulePin(key)}
                                                        className={styles.secondaryBtn}
                                                        style={{ padding: '0.5rem 1rem', fontSize: 13, color: 'var(--danger)' }}
                                                    >
                                                        Remove PIN
                                                    </button>
                                                )}
                                            </div>
                                            {modulePinFeedback[key] && (
                                                <div className={modulePinFeedback[key].type === 'error' ? styles.error : styles.success} style={{ fontSize: 13 }}>
                                                    {modulePinFeedback[key].type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
                                                    {modulePinFeedback[key].msg}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                )}
                {activeTab === 'storage' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <HardDrive className={styles.icon} />
                            <h2>Storage Usage</h2>
                        </div>

                        {isLoadingStorage ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem' }}>
                                <Loader className="spin" size={20} />
                                <span style={{ color: 'var(--text-secondary)' }}>Loading storage data...</span>
                            </div>
                        ) : storageData ? (
                            <>
                                {/* Storage Overview */}
                                <div className={styles.storageOverview}>
                                    <div className={styles.storageStats}>
                                        <div className={styles.storageStat}>
                                            <span className={styles.statLabel}>Used</span>
                                            <span className={styles.statValue}>{storageData.totalUsedFormatted}</span>
                                        </div>
                                        <div className={styles.storageStat}>
                                            <span className={styles.statLabel}>Total</span>
                                            <span className={styles.statValue}>{storageData.totalLimitFormatted}</span>
                                        </div>
                                        <div className={styles.storageStat}>
                                            <span className={styles.statLabel}>Documents</span>
                                            <span className={styles.statValue}>{storageData.documentCount}</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className={styles.storageBarContainer}>
                                        <div className={styles.storageBarHeader}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                                {storageData.percentageUsed}% used
                                            </span>
                                        </div>
                                        <div className={styles.storageBar}>
                                            <div
                                                className={styles.storageProgress}
                                                style={{
                                                    width: `${Math.min(storageData.percentageUsed, 100)}%`,
                                                    background: storageData.percentageUsed > 90
                                                        ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                                                        : storageData.percentageUsed > 70
                                                            ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                                                            : 'linear-gradient(90deg, #10B981, #059669)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Storage Breakdown */}
                                {storageData.breakdown && storageData.breakdown.length > 0 && (
                                    <div className={styles.storageBreakdown}>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                            Storage Breakdown by File Type
                                        </h3>
                                        <div className={styles.breakdownList}>
                                            {storageData.breakdown
                                                .sort((a: any, b: any) => b.size - a.size)
                                                .map((item: any) => (
                                                    <div key={item.type} className={styles.breakdownItem}>
                                                        <div className={styles.breakdownInfo}>
                                                            <span className={styles.breakdownType}>{item.type.toUpperCase()}</span>
                                                            <span className={styles.breakdownCount}>{item.count} file{item.count !== 1 ? 's' : ''}</span>
                                                        </div>
                                                        <span className={styles.breakdownSize}>{item.sizeFormatted}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Storage Info */}
                                <div style={{
                                    marginTop: '1.5rem',
                                    padding: '1rem',
                                    background: 'var(--surface)',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <p style={{ margin: 0 }}>
                                        💡 Storage includes all documents uploaded to briefs and matters.
                                        {storageData.percentageUsed > 80 && ' Consider archiving old files to free up space.'}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                                <p>Unable to load storage data. Please try again later.</p>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'subscription' && (
                    <>
                        {isLoadingSub ? (
                            <div className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', padding: '3rem' }}>
                                <Loader className="spin" size={20} />
                                <span style={{ color: 'var(--text-secondary)' }}>Loading subscription...</span>
                            </div>
                        ) : (
                            <>
                                {/* Current Status */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <CreditCard className={styles.icon} />
                                        <h2>Current Subscription</h2>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        {subscription?.subscriptionStatus === 'active' ? (
                                            <CheckCircle size={20} color="#10b981" />
                                        ) : subscription?.subscriptionStatus === 'expired' ? (
                                            <XCircle size={20} color="#ef4444" />
                                        ) : (
                                            <Clock size={20} color="#f59e0b" />
                                        )}
                                        <span style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>
                                            {subscription?.subscriptionStatus === 'active' ? 'Active' :
                                             subscription?.subscriptionStatus === 'expired' ? 'Expired' : 'Free Plan'}
                                        </span>
                                    </div>
                                    {subscription?.subscriptionStatus === 'active' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            <span><strong>Band:</strong> {BAND_LABELS[subscription.subscriptionBand as SubscriptionBand]}</span>
                                            <span><strong>Tier:</strong> {TIER_LABELS[subscription.subscriptionTier as SubscriptionTier]}</span>
                                            <span><strong>Started:</strong> {new Date(subscription.subscriptionStartedAt).toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
                                            <span><strong>Expires:</strong> {new Date(subscription.subscriptionExpiresAt).toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
                                        </div>
                                    )}
                                    {subscription?.subscriptionStatus !== 'active' && (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            You are currently on the free plan. Subscribe below to unlock full access for your firm.
                                        </p>
                                    )}
                                </div>

                                {/* Subscribe / Renew */}
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <CreditCard className={styles.icon} />
                                        <h2>{subscription?.subscriptionStatus === 'active' ? 'Renew Subscription' : 'Subscribe'}</h2>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                        Select your State Band and firm size. Pricing follows the Legal Practitioners Remuneration Order, 2023.
                                    </p>

                                    {/* Band selector */}
                                    <div className={styles.formGroup}>
                                        <label>State Band</label>
                                        <select
                                            className={styles.select || styles.input}
                                            value={selectedBand}
                                            onChange={e => setSelectedBand(e.target.value as SubscriptionBand)}
                                            title="State Band"
                                            aria-label="State Band"
                                        >
                                            {(Object.keys(BAND_LABELS) as SubscriptionBand[]).map(band => (
                                                <option key={band} value={band}>{BAND_LABELS[band]}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Tier selector */}
                                    <div className={styles.formGroup}>
                                        <label>Firm Size</label>
                                        <select
                                            className={styles.select || styles.input}
                                            value={selectedTier}
                                            onChange={e => setSelectedTier(e.target.value as SubscriptionTier)}
                                            title="Firm Size"
                                            aria-label="Firm Size"
                                        >
                                            {(Object.keys(TIER_LABELS) as SubscriptionTier[]).map(tier => (
                                                <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Price display */}
                                    <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Fee (excl. VAT)</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                                            {formatNaira(SUBSCRIPTION_PRICES[selectedBand][selectedTier])}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>per year · billed annually</div>
                                    </div>

                                    <button
                                        className={styles.saveBtn}
                                        onClick={handleInitiatePayment}
                                        disabled={isInitiatingPayment}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        {isInitiatingPayment
                                            ? <><Loader className="spin" size={16} /> Redirecting to payment…</>
                                            : <><CreditCard size={16} /> Pay with Monnify</>
                                        }
                                    </button>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.75rem' }}>
                                        You will be redirected to Monnify&apos;s secure checkout. Payment by card or bank transfer.
                                    </p>
                                </div>

                                {/* Payment history */}
                                {subPayments.length > 0 && (
                                    <div className={styles.card}>
                                        <div className={styles.cardHeader}>
                                            <Clock className={styles.icon} />
                                            <h2>Payment History</h2>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {subPayments.map(p => (
                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{BAND_LABELS[p.band as SubscriptionBand]} · {TIER_LABELS[p.tier as SubscriptionTier]}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                                                            {new Date(p.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                                                            {p.paidAt && ` · Paid ${new Date(p.paidAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}`}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                                        <span style={{ fontWeight: 600 }}>{formatNaira(p.amount)}</span>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '4px',
                                                            background: p.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                            color: p.status === 'paid' ? '#10b981' : '#f59e0b',
                                                            textTransform: 'capitalize',
                                                        }}>
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>

        <ConfirmDialog
            open={!!deletingAccountId}
            title="Remove bank account"
            message="This bank account will be removed from your firm settings."
            confirmLabel="Remove"
            danger
            onConfirm={() => { if (deletingAccountId) handleDeleteAccount(deletingAccountId); setDeletingAccountId(null); }}
            onCancel={() => setDeletingAccountId(null)}
        />
        <ConfirmDialog
            open={!!revokingKeyId}
            title="Revoke API key"
            message="This key will stop working immediately. Any integration using it will break. This cannot be undone."
            confirmLabel="Revoke"
            danger
            onConfirm={() => { if (revokingKeyId) handleRevokeKey(revokingKeyId); setRevokingKeyId(null); }}
            onCancel={() => setRevokingKeyId(null)}
        /></>
    );
}

// ─── Color Picker Component ────────────────────────────────────────────────────

function ColorPicker({
    label, hint, value, onChange, presets,
}: {
    label: string;
    hint?: string;
    value: string;
    onChange: (v: string) => void;
    presets?: string[];
}) {
    const [hexInput, setHexInput] = useState(value);
    const [rVal, gVal, bVal] = hexToRgb(value);
    const [showRgb, setShowRgb] = useState(false);

    function handleHexInput(raw: string) {
        setHexInput(raw);
        const clean = raw.startsWith('#') ? raw : '#' + raw;
        if (/^#[0-9a-fA-F]{6}$/.test(clean)) onChange(clean);
    }

    function handleRgb(r: number, g: number, b: number) {
        const hex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
        onChange(hex);
        setHexInput(hex);
    }

    // Sync hex input when value changes externally (e.g. from preset click)
    if (hexInput !== value && /^#[0-9a-fA-F]{6}$/.test(value)) {
        setHexInput(value);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
            {hint && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{hint}</div>}

            {/* Colour picker + hex input */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="color"
                    value={value}
                    onChange={e => { onChange(e.target.value); setHexInput(e.target.value); }}
                    style={{ width: 38, height: 38, padding: 2, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
                />
                <input
                    type="text"
                    value={hexInput}
                    onChange={e => handleHexInput(e.target.value)}
                    maxLength={7}
                    placeholder="#000000"
                    style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', fontFamily: 'monospace', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text-primary)' }}
                />
            </div>

            {/* Preset swatches */}
            {presets && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {presets.map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => { onChange(p); setHexInput(p); }}
                            title={p}
                            style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: p, border: value === p ? '2px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.15)',
                                boxShadow: value === p ? '0 0 0 2px var(--primary)' : 'none',
                                cursor: 'pointer', padding: 0,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* RGB toggle */}
            <button
                type="button"
                onClick={() => setShowRgb(v => !v)}
                style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
                {showRgb ? '▲ Hide RGB' : '▼ RGB input'}
            </button>
            {showRgb && (
                <div style={{ display: 'flex', gap: 4 }}>
                    {[['R', rVal], ['G', gVal], ['B', bVal]].map(([ch, val], i) => (
                        <div key={ch as string} style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>{ch}</div>
                            <input
                                type="number"
                                min={0} max={255}
                                value={val as number}
                                onChange={e => {
                                    const nums = [rVal, gVal, bVal];
                                    nums[i] = Math.max(0, Math.min(255, Number(e.target.value)));
                                    handleRgb(nums[0], nums[1], nums[2]);
                                }}
                                style={{ width: '100%', fontSize: '0.75rem', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return [0, 0, 0];
    return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
    ];
}
