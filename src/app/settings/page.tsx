'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Building2, Lock, Save, Image as ImageIcon, Loader, FileText, AlertCircle, Key, Copy, Trash2, Plus, Eye, EyeOff, Check } from 'lucide-react';
import { updateWorkspaceSettings, getWorkspaceSettings } from '@/app/actions/settings';
import { getUserProfile, updateUserProfile } from '@/app/actions/members';
import { getBankAccounts, createBankAccount, deleteBankAccount } from '@/app/actions/bank-accounts';
import { generateApiKey, listApiKeys, revokeApiKey } from '@/app/actions/api-keys';
import { changePassword } from '@/app/actions/auth';
import styles from './page.module.css';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'profile' | 'firm' | 'apikeys' | 'security'>('profile');

    // Config State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Firm Settings
    const [firmCode, setFirmCode] = useState('');
    const [letterheadUrl, setLetterheadUrl] = useState('');
    // Temp state for editing
    const [editLetterheadUrl, setEditLetterheadUrl] = useState('');

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
    const [isPasswordChanging, setIsPasswordChanging] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
        }

        const accountsRes = await getBankAccounts(workspaceId);
        if (accountsRes.success && accountsRes.accounts) {
            setBankAccounts(accountsRes.accounts);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        if (session?.user?.workspaceId) {
            loadSettings(session.user.workspaceId);
            loadApiKeys();
        }
        loadProfile();
    }, [session]);

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
            firmCode: firmCode || null
        });
        if (result.success) {
            setLetterheadUrl(editLetterheadUrl);
            alert('Firm settings saved!');
        }
        setIsSaving(false);
    };

    const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPasswordChanging(true);
        setPasswordFeedback(null);

        const formData = new FormData(e.currentTarget);
        const res = await changePassword(formData);

        if (res.success) {
            setPasswordFeedback({ type: 'success', message: res.message || 'Password updated!' });
            (e.target as HTMLFormElement).reset();
        } else {
            setPasswordFeedback({ type: 'error', message: res.error || 'Failed to update password.' });
        }
        setIsPasswordChanging(false);
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
                                <input type="text" className={styles.input} value={firmCode} onChange={e => setFirmCode(e.target.value)} />
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

                        <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                To change your password, please verify your current password first.
                            </p>

                            {passwordFeedback && (
                                <div className={passwordFeedback.type === 'error' ? styles.error : styles.success}>
                                    {passwordFeedback.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
                                    {passwordFeedback.message}
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    required
                                    className={styles.input}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className={styles.gridRow}>
                                <div className={styles.formGroup}>
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        required
                                        minLength={6}
                                        className={styles.input}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        minLength={6}
                                        className={styles.input}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className={styles.actions}>
                                <button type="submit" className={styles.saveBtn} disabled={isPasswordChanging}>
                                    {isPasswordChanging ? <Loader className="spin" size={18} /> : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
