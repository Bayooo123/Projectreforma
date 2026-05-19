'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Building2, Lock, Loader, FileText, AlertCircle, Key, Copy, Trash2, Plus, Eye, EyeOff, Check, HardDrive, CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';
import { updateWorkspaceSettings, getWorkspaceSettings, getStorageUsage } from '@/app/actions/settings';
import { getUserProfile, updateUserProfile } from '@/app/actions/members';
import { getBankAccounts, createBankAccount, deleteBankAccount } from '@/app/actions/bank-accounts';
import { generateApiKey, listApiKeys, revokeApiKey } from '@/app/actions/api-keys';
import { sendPasswordResetFromSettings } from '@/app/actions/auth';
import { getSubscriptionStatus, initiateSubscriptionPayment, checkPaymentStatus, getSubscriptionPayments } from '@/app/actions/subscriptions';
import { BAND_LABELS, TIER_LABELS, SUBSCRIPTION_PRICES, formatNaira, type SubscriptionBand, type SubscriptionTier } from '@/lib/subscriptionPricing';
import styles from './page.module.css';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'profile' | 'firm' | 'apikeys' | 'security' | 'storage' | 'subscription'>('profile');

    // Config State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Firm Settings
    const [firmCode, setFirmCode] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [letterheadUrl, setLetterheadUrl] = useState('');
    const [brandColor, setBrandColor] = useState('#121826');
    // Temp state for editing
    const [editLetterheadUrl, setEditLetterheadUrl] = useState('');
    const [editBrandColor, setEditBrandColor] = useState('#121826');

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
        const settingsRes = await getWorkspaceSettings(workspaceId);
        if (settingsRes.success && settingsRes.workspace) {
            setFirmCode(settingsRes.workspace.firmCode || '');
            setLetterheadUrl(settingsRes.workspace.letterheadUrl || '');
            setEditLetterheadUrl(settingsRes.workspace.letterheadUrl || '');
            setBrandColor(settingsRes.workspace.brandColor || '#121826');
            setEditBrandColor(settingsRes.workspace.brandColor || '#121826');
        }

        const accountsRes = await getBankAccounts(workspaceId);
        if (accountsRes.success && accountsRes.accounts) {
            setBankAccounts(accountsRes.accounts);
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
        }
        loadProfile();
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
        if (!confirm('Delete this account?')) return;
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
        if (!confirm('Revoke this API key? This cannot be undone.')) return;
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

    const handleSaveFirmSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user?.workspaceId) return;
        setIsSaving(true);
        const result = await updateWorkspaceSettings(session.user.workspaceId, {
            letterheadUrl: editLetterheadUrl,
            firmCode: firmCode || null,
            joinPassword: joinPassword || undefined,
            brandColor: editBrandColor
        });
        if (result.success) {
            setJoinPassword(''); // Clear password field after save for security
            setLetterheadUrl(editLetterheadUrl);
            setBrandColor(editBrandColor);
            alert('Firm settings saved!');
        }
        setIsSaving(false);
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

    // Check if user can manage API keys (owner/partner only)
    const canManageApiKeys = session?.user?.role === 'owner' || session?.user?.role === 'partner';

    if (isLoading && !session) return <div className={styles.loading}><Loader className="spin" /> Loading...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Settings</h1>
                <p>Manage your personal profile, firm preferences, and integrations.</p>
            </header>

            <div className={styles.tabsContainer}>
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`} onClick={() => setActiveTab('profile')}>
                        <User size={18} /> Profile
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'firm' ? styles.activeTab : ''}`} onClick={() => setActiveTab('firm')}>
                        <Building2 size={18} /> Firm
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

            <div className={styles.content}>
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
                            <label>Lawyer Token</label>
                            <div className={styles.tokenDisplay}>
                                <span className={styles.tokenValue}>{lawyerToken || '----'}</span>
                                <p className={styles.hint}>System-assigned unique 4-digit code for record authentication.</p>
                            </div>
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
                            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                <label>Brand Color</label>
                                <p className={styles.hint} style={{ marginBottom: '1rem' }}>
                                    Choose a primary color for your workspace theme (sidebar accents, buttons, etc).
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={editBrandColor}
                                        onChange={(e) => setEditBrandColor(e.target.value)}
                                        style={{ width: '60px', height: '40px', padding: '2px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['#121826', '#0f172a', '#1e293b', '#2d3748', '#3182ce', '#38a169', '#d53f8c', '#805ad5'].map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setEditBrandColor(color)}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: color,
                                                    border: editBrandColor === color ? '2px solid white' : '1px solid rgba(0,0,0,0.1)',
                                                    boxShadow: editBrandColor === color ? '0 0 0 2px var(--primary)' : 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                        {editBrandColor.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.actions}>
                                <button type="submit" className={styles.saveBtn} disabled={isSaving}>Save Configuration</button>
                            </div>
                        </form>

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
                                        <button onClick={() => handleDeleteAccount(account.id)} className={styles.removeBtn}>Remove</button>
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
                                    I've saved the key
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
                                                onClick={() => handleRevokeKey(key.id)}
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
                                    We'll send a secure password reset link to your account email address.
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
                                        You will be redirected to Monnify's secure checkout. Payment by card or bank transfer.
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
    );
}
