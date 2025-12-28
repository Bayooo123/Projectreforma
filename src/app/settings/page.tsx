'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Building2, Lock, Save, Image as ImageIcon, Loader, FileText, AlertCircle } from 'lucide-react';
import { updateWorkspaceSettings, getWorkspaceSettings } from '@/app/actions/settings';
import { getUserProfile, updateUserProfile } from '@/app/actions/members';
import { getBankAccounts, createBankAccount, deleteBankAccount } from '@/app/actions/bank-accounts';
import styles from './page.module.css';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'profile' | 'firm'>('profile');

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

    const loadProfile = async () => {
        // We need a way to get the current profile beyond just session
        // Using server action for up-to-date data
        // For now, assuming session might be stale or strict, let's fetch profile separately if needed 
        // or just rely on a new server action getUserProfile()
        const res = await getUserProfile();
        if (res.success && res.user) {
            setJobTitle(res.user.jobTitle || '');
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

    // ... handleSaveFirmSettings logic remains ...
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

    if (isLoading && !session) return <div className={styles.loading}><Loader className="spin" /> Loading...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Settings</h1>
                <p>Manage your personal profile and firm preferences.</p>
            </header>

            <div className={styles.tabsContainer}>
                {/* Tabs logic remains same */}
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`} onClick={() => setActiveTab('profile')}>
                        <User size={18} /> Personal Profile
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'firm' ? styles.activeTab : ''}`} onClick={() => setActiveTab('firm')}>
                        <Building2 size={18} /> Firm Settings
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
                            {/* Letterhead & Firm Code inputs same as before */}
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
            </div>
        </div>
    );
}
