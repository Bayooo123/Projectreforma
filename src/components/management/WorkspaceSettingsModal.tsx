"use client";

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { X, Upload, FileText, Loader, Check, Lock, Key, Building } from 'lucide-react';
import { put } from '@vercel/blob';
import { getWorkspaceMembers, approveMember, rejectMember } from '@/app/actions/members';
import { updateWorkspaceAccess, WorkspaceAccessState } from '@/app/actions/workspace';
import styles from './InvoiceModal.module.css'; // Reusing modal styles for consistency

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    currentLetterheadUrl?: string | null;
    firmCode?: string | null;
    onUpdate: () => void;
}

const initialState: WorkspaceAccessState = {};

const WorkspaceSettingsModal = ({ isOpen, onClose, workspaceId, currentLetterheadUrl, firmCode, onUpdate }: WorkspaceSettingsModalProps) => {
    const [activeTab, setActiveTab] = useState<'general' | 'members' | 'access'>('general');
    const [members, setMembers] = useState<any[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [accessState, accessAction] = useFormState(updateWorkspaceAccess, initialState);

    // Fetch members when switching to members tab
    useEffect(() => {
        if (activeTab === 'members' && isOpen) {
            fetchMembers();
        }
    }, [activeTab, isOpen]);

    useEffect(() => {
        if (accessState.success) {
            setSuccessMessage(accessState.message || 'Settings updated');
            setTimeout(() => setSuccessMessage(null), 3000);
            onUpdate(); // Refresh parent to get new firmCode if changed
        }
    }, [accessState, onUpdate]);

    const fetchMembers = async () => {
        setIsLoadingMembers(true);
        try {
            const result = await getWorkspaceMembers(workspaceId);
            if (result.success) {
                setMembers(result.data || []);
            }
        } catch (error) {
            console.error('Failed to load members', error);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const handleApprove = async (memberId: string) => {
        const result = await approveMember(memberId);
        if (result.success) {
            fetchMembers(); // Refresh list
            setSuccessMessage('Member approved successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    const handleReject = async (memberId: string) => {
        if (!confirm('Are you sure you want to reject and remove this member?')) return;
        const result = await rejectMember(memberId);
        if (result.success) {
            fetchMembers();
            setSuccessMessage('Member removed successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type (Image or PDF)
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            setUploadError('Please upload an image (JPG, PNG) or PDF file.');
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setSuccessMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('workspaceId', workspaceId);
            formData.append('type', 'letterhead');

            const response = await fetch('/api/upload/letterhead', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                setSuccessMessage('Letterhead uploaded successfully!');
                onUpdate(); // Trigger refresh in parent
            } else {
                setUploadError(result.error || 'Failed to upload letterhead.');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadError('An unexpected error occurred during upload.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Workspace Settings</h2>
                        <p className={styles.subtitle}>Manage your office configuration</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', padding: '0 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('general')}
                        style={{
                            padding: '1rem 0',
                            borderBottom: activeTab === 'general' ? '2px solid var(--primary)' : 'none',
                            color: activeTab === 'general' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            background: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        style={{
                            padding: '1rem 0',
                            borderBottom: activeTab === 'members' ? '2px solid var(--primary)' : 'none',
                            color: activeTab === 'members' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            background: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Members
                    </button>
                    <button
                        onClick={() => setActiveTab('access')}
                        style={{
                            padding: '1rem 0',
                            borderBottom: activeTab === 'access' ? '2px solid var(--primary)' : 'none',
                            color: activeTab === 'access' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            background: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                    >
                        <Lock size={14} />
                        Access
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'general' && (
                        <div className={styles.formGroup}>
                            {/* Letterhead Upload Logic */}
                            <label className={styles.formLabel}>Letterhead Upload</label>
                            <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
                                Upload your firm's letterhead (PDF or High-res Image). This will be used as the background for generated PDF invoices.
                            </p>

                            <div style={{
                                border: '2px dashed var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: 'var(--surface)'
                            }}>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileUpload}
                                    style={{
                                        opacity: 0,
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        top: 0,
                                        left: 0,
                                        cursor: 'pointer'
                                    }}
                                    disabled={isUploading}
                                />
                                {isUploading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <Loader size={32} className="spin" />
                                        <span>Uploading...</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <Upload size={32} color="var(--primary)" />
                                        <span style={{ fontWeight: 600 }}>Click to upload letterhead</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Supports JPG, PNG, PDF</span>
                                    </div>
                                )}
                            </div>

                            {/* Error/Success Messages Reused */}
                            {uploadError && <p style={{ color: '#DC2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>{uploadError}</p>}
                            {successMessage && <p style={{ color: '#16A34A', fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={16} /> {successMessage}</p>}

                            {currentLetterheadUrl && (
                                <div style={{ marginTop: '1.5rem' }}>
                                    <p className={styles.formLabel}>Current Letterhead:</p>
                                    <div style={{
                                        marginTop: '0.5rem',
                                        padding: '0.5rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <FileText size={20} color="var(--primary)" />
                                        <a href={currentLetterheadUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                                            View Uploaded Letterhead
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className={styles.formGroup}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Team Members</h3>
                            {isLoadingMembers ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader className="spin" />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {members.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No other members yet.</p>}
                                    {members.map((member) => (
                                        <div key={member.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '1rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            background: member.status === 'pending' ? '#fff7ed' : 'var(--surface)'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600 }}>{member.name}</span>
                                                    {member.status === 'pending' && (
                                                        <span style={{ background: '#f59e0b', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>
                                                            PENDING
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {member.designation || member.role} • {member.email}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {member.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(member.id)}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: '#16a34a',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(member.id)}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: '#dc2626',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {member.status === 'active' && (
                                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Active</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'access' && (
                        <form action={accessAction} className={styles.formGroup}>
                            <input type="hidden" name="workspaceId" value={workspaceId} />

                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Firm Access Credentials</h3>
                            <p className={styles.subtitle} style={{ marginBottom: '1.5rem' }}>
                                Share these credentials with your team members so they can join this workspace.
                            </p>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className={styles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building size={16} /> Firm Code
                                </label>
                                <input
                                    name="firmCode"
                                    defaultValue={firmCode || ''}
                                    placeholder="e.g. ASCO-LP"
                                    className={styles.input}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                                />
                                {accessState.errors?.firmCode && (
                                    <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>{accessState.errors.firmCode[0]}</p>
                                )}
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className={styles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Key size={16} /> Join Password
                                </label>
                                <input
                                    name="firmPassword"
                                    type="password"
                                    placeholder="Set a new password to reset"
                                    className={styles.input}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    Leave blank to keep current password. Required if setting up for the first time.
                                </p>
                                {accessState.errors?.firmPassword && (
                                    <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>{accessState.errors.firmPassword[0]}</p>
                                )}
                            </div>

                            {/* Revenue PIN Section */}
                            <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Finance Security</h4>
                                <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
                                    Set a 5-digit PIN to hide total revenue on the dashboard. Leave blank to disable.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className={styles.formLabel}>Revenue PIN</label>
                                        <input
                                            name="revenuePin" // We'll need to handle this in a separate handler or update action
                                            type="password"
                                            maxLength={5}
                                            placeholder="-----"
                                            className={styles.input}
                                            onChange={async (e) => {
                                                // Quick hack: Handle PIN update separately on blur or change if valid
                                                // Ideally we'd update the form action, but let's do an optimistic local update
                                                // Actually, let's just make a separate button for this or integrate.
                                                // User might expect "Update Credentials" to save this.
                                                // Let's rely on a separate specific button for PIN to avoid modifying the massive access action right now.
                                            }}
                                            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', letterSpacing: '0.25rem' }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async (e) => {
                                            const input = (e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement);
                                            const pin = input?.value;
                                            if (pin && pin.length === 5) {
                                                // Call action
                                                const { setRevenuePin } = await import('@/app/actions/clients');
                                                const res = await setRevenuePin(workspaceId, pin);
                                                if (res.success) {
                                                    alert('Revenue PIN set successfully');
                                                } else {
                                                    alert('Failed to set PIN: ' + res.error);
                                                }
                                            } else {
                                                alert('Please enter exactly 5 digits');
                                            }
                                        }}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            color: 'var(--text-primary)',
                                            fontWeight: 500
                                        }}
                                    >
                                        Set PIN
                                    </button>
                                </div>
                            </div>

                            {accessState.errors?._form && (
                                <div style={{ color: '#dc2626', background: '#fee2e2', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                    {accessState.errors._form[0]}
                                </div>
                            )}

                            {successMessage && (
                                <div style={{ color: '#16a34a', background: '#dcfce7', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Check size={16} /> {successMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                Update Credentials
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkspaceSettingsModal;
