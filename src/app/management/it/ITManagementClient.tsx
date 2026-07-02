'use client';

import { useState, useEffect, useTransition } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
    Users, ShieldCheck, ClipboardList, Monitor, Activity,
    Plus, Trash2, Edit2, Check, X, ChevronDown,
    UserX, RefreshCw, Loader2, FileText, Download,
    Ban, AlertTriangle, Clock, LogOut, Mail, RotateCcw, GitBranch, Inbox,
    BookOpen, CheckCircle2, Circle,
} from 'lucide-react';
import EmailInboxClient from '@/app/emails/EmailInboxClient';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
    getGuestMembers, inviteGuestMember, updateGuestMember, revokeGuestMember,
    grantBriefAccess, revokeBriefAccess, sendGuestInviteEmail,
    getWorkspaceMembers, updateMemberRole, updateMemberDownloadPermission,
    getAuditLogs, getActiveSessions, forceLogoutUser,
    getWorkspaceBriefs, getActivityLogs,
    toggleMemberCanDelete, getDeletedRecords, restoreRecord,
    getBriefAttributions, updateBriefAttribution,
} from '@/app/actions/it-management';
import { getTeamWorkLogs, updateWorkEntryStatus, deleteWorkEntry } from '@/app/actions/work-entries';
import type { WorkEntry } from '@/app/actions/work-entries';

type Tab = 'inbox' | 'guests' | 'roles' | 'audit' | 'sessions' | 'activity' | 'deleted' | 'attribution' | 'worklogs';

const ROLES = ['owner', 'admin', 'lawyer', 'paralegal', 'viewer'];

const ROLE_DESCRIPTIONS: Record<string, string> = {
    owner: 'Full access, billing, workspace deletion',
    admin: 'Manage members, all content',
    lawyer: 'Create/edit briefs, matters, clients',
    paralegal: 'View and comment, limited editing',
    viewer: 'Read-only access',
};

export default function ITManagementClient({ workspaceId, isAdmin = false }: { workspaceId: string; isAdmin?: boolean }) {
    const [activeTab, setActiveTab] = useState<Tab>('inbox');
    const isMobile = useIsMobile();

    const allTabs: { id: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
        { id: 'inbox', label: 'Email Inbox', icon: Inbox },
        { id: 'guests', label: 'Guest Accounts', icon: Users, adminOnly: true },
        { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck, adminOnly: true },
        { id: 'audit', label: 'Audit Log', icon: ClipboardList, adminOnly: true },
        { id: 'sessions', label: 'Session Control', icon: Monitor, adminOnly: true },
        { id: 'activity', label: 'Activity Log', icon: Activity, adminOnly: true },
        { id: 'deleted', label: 'Deleted Records', icon: Trash2, adminOnly: true },
        { id: 'attribution', label: 'Brief Attribution', icon: GitBranch, adminOnly: true },
        { id: 'worklogs', label: 'Work Logs', icon: BookOpen, adminOnly: true },
    ];

    const tabs = allTabs.filter(t => !t.adminOnly || isAdmin);

    // ── Mobile gate (F-03) ────────────────────────────────────────────────
    // IT Management is built around wide data tables that are unusable at
    // 375px. On mobile we surface the two actions admins most need on the
    // go — Invite Guest and Force Logout — and link to the desktop for
    // everything else. The full UI is untouched on desktop.
    if (isMobile) {
        return <ITManagementMobile workspaceId={workspaceId} isAdmin={isAdmin} />;
    }

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                    IT Management
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    {isAdmin
                        ? 'Control access, roles, audit trails, and active sessions across your workspace.'
                        : 'Manage your firm\'s email inbox — link emails to briefs and triage unlinked mail.'}
                </p>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '0.875rem', fontWeight: activeTab === tab.id ? 600 : 400,
                            color: activeTab === tab.id ? '#1e293b' : '#64748b',
                            borderBottom: activeTab === tab.id ? '2px solid #1e293b' : '2px solid transparent',
                            marginBottom: -1,
                            transition: 'all 0.15s',
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'inbox' && <EmailInboxClient />}
            {activeTab === 'guests' && <GuestAccountsTab workspaceId={workspaceId} />}
            {activeTab === 'roles' && <RolesTab />}
            {activeTab === 'audit' && <AuditLogTab />}
            {activeTab === 'sessions' && <SessionsTab />}
            {activeTab === 'activity' && <ActivityLogTab />}
            {activeTab === 'deleted' && <DeletedRecordsTab />}
            {activeTab === 'attribution' && <BriefAttributionTab />}
            {activeTab === 'worklogs' && <WorkLogsTab workspaceId={workspaceId} />}
        </div>
    );
}

// ── Mobile gate component ──────────────────────────────────────────────────────
// Surfaces the two most-needed mobile admin actions; defers everything else
// to desktop with a clear, non-broken message.

function ITManagementMobile({ workspaceId, isAdmin }: { workspaceId: string; isAdmin: boolean }) {
    const [mobileView, setMobileView] = useState<'home' | 'invite' | 'sessions'>('home');

    if (mobileView === 'invite') {
        return <MobileGuestInvite workspaceId={workspaceId} onBack={() => setMobileView('home')} />;
    }
    if (mobileView === 'sessions') {
        return <MobileSessionControl onBack={() => setMobileView('home')} />;
    }

    return (
        <div style={{ padding: '20px 16px', fontFamily: 'var(--font-ui, system-ui, sans-serif)' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#059669', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Workspace</p>
                <h1 style={{ fontSize: 28, fontWeight: 600, color: '#0F172A', letterSpacing: '-0.015em', fontFamily: 'Georgia, serif', lineHeight: 1.1, margin: 0 }}>IT Management</h1>
            </div>

            {/* Desktop notice */}
            <div style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 24,
            }}>
                <Monitor size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#92400E', margin: '0 0 3px' }}>Best experienced on desktop</p>
                    <p style={{ fontSize: 12.5, color: '#B45309', margin: 0, lineHeight: 1.4 }}>
                        Audit logs, role matrices, and activity tables are optimised for larger screens.
                        The most-used admin actions are available below.
                    </p>
                </div>
            </div>

            {/* Mobile-available actions */}
            {isAdmin && (
                <>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 10 }}>Quick Actions</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                        <button
                            onClick={() => setMobileView('invite')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '15px 16px',
                                background: '#fff', border: '1px solid #E2E8F0',
                                borderRadius: 16, cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(15,23,42,.05)',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{ width: 42, height: 42, borderRadius: 13, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Users size={20} color="#059669" />
                            </div>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>Invite Guest</p>
                                <p style={{ fontSize: 12.5, color: '#94A3B8', margin: 0 }}>Add a temporary access account</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setMobileView('sessions')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '15px 16px',
                                background: '#fff', border: '1px solid #E2E8F0',
                                borderRadius: 16, cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(15,23,42,.05)',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{ width: 42, height: 42, borderRadius: 13, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <LogOut size={20} color="#DC2626" />
                            </div>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>Force Logout</p>
                                <p style={{ fontSize: 12.5, color: '#94A3B8', margin: 0 }}>End active sessions for a member</p>
                            </div>
                        </button>
                    </div>
                </>
            )}

            {/* Email inbox is already mobile-fit — link directly */}
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 10 }}>Also Available</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                    onClick={() => window.location.href = '/emails'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '15px 16px',
                        background: '#fff', border: '1px solid #E2E8F0',
                        borderRadius: 16, cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(15,23,42,.05)',
                        textAlign: 'left',
                    }}
                >
                    <div style={{ width: 42, height: 42, borderRadius: 13, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Inbox size={20} color="#2563EB" />
                    </div>
                    <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>Email Inbox</p>
                        <p style={{ fontSize: 12.5, color: '#94A3B8', margin: 0 }}>Link emails to briefs on mobile</p>
                    </div>
                </button>
            </div>
        </div>
    );
}

// ── Mobile Invite Guest ────────────────────────────────────────────────────────
function MobileGuestInvite({ workspaceId, onBack }: { workspaceId: string; onBack: () => void }) {
    const [form, setForm] = useState({ email: '', name: '', designation: '', expiresAt: '', canDownload: false });
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    function handleInvite() {
        if (!form.email || !form.name) { setError('Email and name are required'); return; }
        setError('');
        startTransition(async () => {
            try {
                await inviteGuestMember({
                    email: form.email, name: form.name,
                    designation: form.designation,
                    expiresAt: form.expiresAt || undefined,
                    canDownload: form.canDownload,
                });
                setSuccess(true);
            } catch (e: any) {
                setError(e.message);
            }
        });
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 14px',
        border: '1px solid #E2E8F0', borderRadius: 12,
        fontSize: 15, fontFamily: 'inherit',
        background: '#fff', color: '#0F172A', outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <div style={{ padding: '16px', fontFamily: 'var(--font-ui, system-ui, sans-serif)' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 14, fontWeight: 600, marginBottom: 20, padding: 0 }}>
                ← Back
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#0F172A', margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>Invite Guest</h2>

            {success ? (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14, padding: 20, textAlign: 'center' }}>
                    <Check size={32} color="#059669" style={{ marginBottom: 10 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#065F46', margin: '0 0 8px' }}>Guest invited!</p>
                    <p style={{ fontSize: 13, color: '#6EE7B7', margin: '0 0 16px' }}>They'll receive an invite email.</p>
                    <button onClick={onBack} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Done</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <p style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2', padding: '10px 14px', borderRadius: 10, margin: 0 }}>{error}</p>}
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Email *</label>
                        <input style={inputStyle} type="email" placeholder="guest@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Full Name *</label>
                        <input style={inputStyle} placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Designation</label>
                        <input style={inputStyle} placeholder="e.g. Intern, NYSC" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expiry Date (optional)</label>
                        <input style={inputStyle} type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.canDownload} onChange={e => setForm(f => ({ ...f, canDownload: e.target.checked }))} />
                        Allow document downloads
                    </label>
                    <button
                        onClick={handleInvite}
                        disabled={isPending}
                        style={{ width: '100%', height: 52, background: 'linear-gradient(160deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                    >
                        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        {isPending ? 'Sending…' : 'Send Invite'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Mobile Session Control ─────────────────────────────────────────────────────
function MobileSessionControl({ onBack }: { onBack: () => void }) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [forceLogoutTarget, setForceLogoutTarget] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        setLoading(true);
        getActiveSessions().then(data => { setSessions(data); setLoading(false); });
    }, []);

    // Group by user
    const byUser: Record<string, any> = sessions.reduce((acc: any, s: any) => {
        if (!acc[s.userId]) acc[s.userId] = { user: s.user, sessions: [] };
        acc[s.userId].sessions.push(s);
        return acc;
    }, {});

    function handleForceLogout(userId: string) {
        startTransition(async () => {
            await forceLogoutUser(userId);
            const data = await getActiveSessions();
            setSessions(data);
            setForceLogoutTarget(null);
        });
    }

    return (
        <div style={{ padding: '16px', fontFamily: 'var(--font-ui, system-ui, sans-serif)' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 14, fontWeight: 600, marginBottom: 20, padding: 0 }}>
                ← Back
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#0F172A', margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>Active Sessions</h2>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 20px' }}>Force-logout a member to end all their active sessions immediately.</p>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} color="#94A3B8" className="animate-spin" /></div>
            ) : Object.keys(byUser).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 14 }}>No active sessions recorded.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.values(byUser).map((entry: any) => (
                        <div key={entry.user.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#064e3b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                                {entry.user.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14.5, fontWeight: 600, color: '#0F172A', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user.name}</p>
                                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.sessions.length} session{entry.sessions.length !== 1 ? 's' : ''}</p>
                            </div>
                            <button
                                onClick={() => setForceLogoutTarget({ id: entry.user.id, name: entry.user.name })}
                                disabled={isPending}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                            >
                                <LogOut size={13} /> Logout
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={!!forceLogoutTarget}
                title="Force logout"
                message={`Sign out all sessions for ${forceLogoutTarget?.name}? They will be redirected to login.`}
                confirmLabel="Force Logout"
                danger
                onConfirm={() => { if (forceLogoutTarget) handleForceLogout(forceLogoutTarget.id); }}
                onCancel={() => setForceLogoutTarget(null)}
            />
        </div>
    );
}

// ─── Guest Accounts Tab ────────────────────────────────────────────────────────

function GuestAccountsTab({ workspaceId }: { workspaceId: string }) {
    const [guests, setGuests] = useState<any[]>([]);
    const [briefs, setBriefs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [expandedGuest, setExpandedGuest] = useState<string | null>(null);
    const [sentInvite, setSentInvite] = useState<string | null>(null);

    const [form, setForm] = useState({ email: '', name: '', designation: '', expiresAt: '', canDownload: false });
    const [revokingMemberId, setRevokingMemberId] = useState<string | null>(null);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        load();
        getWorkspaceBriefs().then(setBriefs);
    }, []);

    function load() {
        setLoading(true);
        getGuestMembers().then(data => { setGuests(data); setLoading(false); });
    }

    function handleInvite() {
        if (!form.email || !form.name) { setFormError('Email and name are required'); return; }
        setFormError('');
        startTransition(async () => {
            try {
                await inviteGuestMember({ email: form.email, name: form.name, designation: form.designation, expiresAt: form.expiresAt || undefined, canDownload: form.canDownload });
                setForm({ email: '', name: '', designation: '', expiresAt: '', canDownload: false });
                setShowInvite(false);
                load();
            } catch (e: any) {
                setFormError(e.message);
            }
        });
    }

    function handleRevoke(memberId: string) {
        startTransition(async () => {
            await revokeGuestMember(memberId);
            load();
        });
    }

    function handleGrantBrief(memberId: string, briefId: string) {
        startTransition(async () => {
            await grantBriefAccess(memberId, briefId);
            load();
        });
    }

    function handleRevokeBrief(memberId: string, briefId: string) {
        startTransition(async () => {
            await revokeBriefAccess(memberId, briefId);
            load();
        });
    }

    function toggleDownload(memberId: string, current: boolean) {
        startTransition(async () => {
            await updateGuestMember(memberId, { canDownload: !current });
            load();
        });
    }

    const activeGuests = guests.filter(g => g.status !== 'revoked');
    const revokedGuests = guests.filter(g => g.status === 'revoked');

    return (
        <><div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Guest Accounts</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Temporary access for interns, NYSC, or external reviewers. View-only by default.</p>
                </div>
                <button onClick={() => setShowInvite(!showInvite)} style={btnStyle('#1e293b', '#fff')}>
                    <Plus size={14} /> Add Guest
                </button>
            </div>

            {showInvite && (
                <div style={cardStyle}>
                    <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '1rem' }}>New Guest Account</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input style={inputStyle} type="email" placeholder="guest@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div>
                            <label style={labelStyle}>Full Name</label>
                            <input style={inputStyle} placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <label style={labelStyle}>Designation (optional)</label>
                            <input style={inputStyle} placeholder="e.g. Intern, NYSC" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
                        </div>
                        <div>
                            <label style={labelStyle}>Account Expiry (optional)</label>
                            <input style={inputStyle} type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem' }}>
                        <input type="checkbox" checked={form.canDownload} onChange={e => setForm(f => ({ ...f, canDownload: e.target.checked }))} />
                        Allow document downloads
                    </label>
                    {formError && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{formError}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleInvite} disabled={isPending} style={btnStyle('#1e293b', '#fff')}>
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create Guest
                        </button>
                        <button onClick={() => setShowInvite(false)} style={btnStyle('#f1f5f9', '#475569')}>Cancel</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={20} className="animate-spin" color="#94a3b8" /></div>
            ) : activeGuests.length === 0 ? (
                <div style={emptyStyle}>No guest accounts yet.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeGuests.map(guest => {
                        const isExpanded = expandedGuest === guest.id;
                        const isExpired = guest.expiresAt && new Date(guest.expiresAt) < new Date();
                        const grantedBriefIds = new Set(guest.briefGrants?.map((g: any) => g.briefId));

                        return (
                            <div key={guest.id} style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={avatarStyle}>
                                            {guest.user.name?.[0]?.toUpperCase() || 'G'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{guest.user.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{guest.user.email} · {guest.designation || 'Guest'}</div>
                                            {isExpired && (
                                                <span style={badgeStyle('#fef2f2', '#dc2626')}>
                                                    <AlertTriangle size={11} /> Expired
                                                </span>
                                            )}
                                            {guest.expiresAt && !isExpired && (
                                                <span style={badgeStyle('#fffbeb', '#d97706')}>
                                                    <Clock size={11} /> Expires {new Date(guest.expiresAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={badgeStyle(guest.canDownload ? '#f0fdf4' : '#f8fafc', guest.canDownload ? '#059669' : '#94a3b8')}>
                                            {guest.canDownload ? <Download size={11} /> : <Ban size={11} />}
                                            {guest.canDownload ? 'Downloads on' : 'No downloads'}
                                        </span>
                                        <button onClick={() => toggleDownload(guest.id, guest.canDownload)} title="Toggle download permission" style={iconBtnStyle}>
                                            <RefreshCw size={14} />
                                        </button>
                                        <button onClick={() => setExpandedGuest(isExpanded ? null : guest.id)} style={iconBtnStyle}>
                                            <FileText size={14} /> Brief Access <ChevronDown size={12} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                startTransition(async () => {
                                                    await sendGuestInviteEmail(guest.id);
                                                    setSentInvite(guest.id);
                                                    setTimeout(() => setSentInvite(null), 3000);
                                                });
                                            }}
                                            disabled={isPending}
                                            style={iconBtnStyle}
                                            title="Resend invite email"
                                        >
                                            {sentInvite === guest.id ? <Check size={14} color="#059669" /> : <Mail size={14} />}
                                            {sentInvite === guest.id ? 'Sent!' : 'Resend Invite'}
                                        </button>
                                        <button onClick={() => setRevokingMemberId(guest.id)} style={{ ...iconBtnStyle, color: '#dc2626' }}>
                                            <UserX size={14} /> Revoke
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                                            Select briefs this guest can access. Unselected briefs are hidden from them.
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
                                            {briefs.map(brief => {
                                                const granted = grantedBriefIds.has(brief.id);
                                                return (
                                                    <button
                                                        key={brief.id}
                                                        onClick={() => granted ? handleRevokeBrief(guest.id, brief.id) : handleGrantBrief(guest.id, brief.id)}
                                                        style={{
                                                            padding: '0.35rem 0.65rem',
                                                            borderRadius: 6,
                                                            fontSize: '0.78rem',
                                                            border: granted ? '1px solid #6366f1' : '1px solid #e2e8f0',
                                                            background: granted ? '#eef2ff' : '#f8fafc',
                                                            color: granted ? '#4f46e5' : '#475569',
                                                            cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                                                        }}
                                                    >
                                                        {granted ? <Check size={11} /> : <Plus size={11} />}
                                                        {brief.customTitle || brief.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {revokedGuests.length > 0 && (
                <details style={{ marginTop: '1.5rem' }}>
                    <summary style={{ fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
                        {revokedGuests.length} revoked account{revokedGuests.length > 1 ? 's' : ''}
                    </summary>
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {revokedGuests.map(g => (
                            <div key={g.id} style={{ ...cardStyle, opacity: 0.5, fontSize: '0.8rem' }}>
                                {g.user.name} · {g.user.email} — <span style={{ color: '#dc2626' }}>Revoked</span>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>

        <ConfirmDialog
            open={!!revokingMemberId}
            title="Revoke guest access"
            message="This guest will no longer be able to log in. You can re-invite them later."
            confirmLabel="Revoke"
            danger
            onConfirm={() => { if (revokingMemberId) handleRevoke(revokingMemberId); setRevokingMemberId(null); }}
            onCancel={() => setRevokingMemberId(null)}
        /></>
    );
}

// ─── Roles & Permissions Tab ───────────────────────────────────────────────────

function RolesTab() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState('');

    useEffect(() => {
        getWorkspaceMembers().then(data => { setMembers(data); setLoading(false); });
    }, []);

    function reload() {
        setLoading(true);
        getWorkspaceMembers().then(data => { setMembers(data); setLoading(false); });
    }

    function handleRoleChange(memberId: string) {
        startTransition(async () => {
            await updateMemberRole(memberId, selectedRole);
            setEditingRole(null);
            reload();
        });
    }

    function toggleDownload(memberId: string, current: boolean) {
        startTransition(async () => {
            await updateMemberDownloadPermission(memberId, !current);
            reload();
        });
    }

    function toggleCanDelete(memberId: string, current: boolean) {
        startTransition(async () => {
            await toggleMemberCanDelete(memberId, !current);
            reload();
        });
    }

    const roleColor: Record<string, string> = {
        owner: '#7c3aed', admin: '#1e293b', lawyer: '#0369a1',
        paralegal: '#0891b2', viewer: '#64748b',
    };

    return (
        <div>
            <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Roles & Permissions</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Manage member roles and control document download permissions.</p>
            </div>

            {/* Role Matrix */}
            <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem', color: '#475569' }}>Role Capability Matrix</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th style={thStyle}>Capability</th>
                                {ROLES.map(r => (
                                    <th key={r} style={{ ...thStyle, color: roleColor[r] }}>{r}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ['View briefs & matters', true, true, true, true, true],
                                ['Create / edit briefs', false, true, true, false, false],
                                ['Add clients & matters', false, true, true, false, false],
                                ['Manage members', false, true, false, false, false],
                                ['Access IT Management', false, true, false, false, false],
                                ['Workspace settings', true, false, false, false, false],
                                ['Delete workspace', true, false, false, false, false],
                            ].map(([cap, ...vals]) => (
                                <tr key={String(cap)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.5rem', color: '#475569' }}>{cap}</td>
                                    {vals.map((v, i) => (
                                        <td key={i} style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            {v ? <Check size={14} color="#059669" /> : <X size={14} color="#cbd5e1" />}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={20} className="animate-spin" color="#94a3b8" /></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {members.map(member => (
                        <div key={member.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={avatarStyle}>{member.user.name?.[0]?.toUpperCase() || 'U'}</div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{member.user.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{member.user.email}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {/* Download toggle */}
                                <button
                                    onClick={() => toggleDownload(member.id, member.canDownload)}
                                    disabled={isPending}
                                    title={member.canDownload ? 'Click to disable downloads' : 'Click to enable downloads'}
                                    style={badgeStyle(member.canDownload ? '#f0fdf4' : '#fef2f2', member.canDownload ? '#059669' : '#dc2626') as React.CSSProperties}
                                >
                                    {member.canDownload ? <Download size={11} /> : <Ban size={11} />}
                                    {member.canDownload ? 'Downloads' : 'No Downloads'}
                                </button>

                                {/* canDelete toggle */}
                                <button
                                    onClick={() => toggleCanDelete(member.id, member.canDelete)}
                                    disabled={isPending}
                                    title={member.canDelete ? 'Click to revoke delete permission' : 'Click to grant delete permission'}
                                    style={badgeStyle(member.canDelete ? '#fef2f2' : '#f8fafc', member.canDelete ? '#dc2626' : '#94a3b8') as React.CSSProperties}
                                >
                                    <Trash2 size={11} />
                                    {member.canDelete ? 'Can Delete' : 'No Delete'}
                                </button>

                                {/* Role selector */}
                                {editingRole === member.id ? (
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <select
                                            value={selectedRole}
                                            onChange={e => setSelectedRole(e.target.value)}
                                            style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <button onClick={() => handleRoleChange(member.id)} style={iconBtnStyle}><Check size={14} /></button>
                                        <button onClick={() => setEditingRole(null)} style={iconBtnStyle}><X size={14} /></button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setEditingRole(member.id); setSelectedRole(member.role); }}
                                        style={{ ...badgeStyle('#f8fafc', roleColor[member.role] || '#475569'), cursor: 'pointer', border: '1px solid #e2e8f0' } as React.CSSProperties}
                                    >
                                        {member.role} <Edit2 size={11} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Audit Log Tab ─────────────────────────────────────────────────────────────

function AuditLogTab() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => { load(); }, []);

    function load(f?: string) {
        setLoading(true);
        getAuditLogs(200, f).then(data => { setLogs(data); setLoading(false); });
    }

    function handleFilter(e: React.FormEvent) {
        e.preventDefault();
        load(filter);
    }

    const eventColor: Record<string, string> = {
        guest_invited: '#0369a1', guest_revoked: '#dc2626', guest_updated: '#0891b2',
        role_changed: '#7c3aed', permission_changed: '#d97706',
        force_logout: '#dc2626', LOGIN_SUCCESS: '#059669', LOGOUT: '#64748b',
        LOGIN_FAILURE: '#dc2626', PASSWORD_RESET_REQUEST: '#d97706', PASSWORD_RESET_SUCCESS: '#0891b2',
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Access Audit Log</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Track all access events, permission changes, and security actions.</p>
                </div>
                <form onSubmit={handleFilter} style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                        value={filter} onChange={e => setFilter(e.target.value)}
                        placeholder="Filter by event..."
                        style={{ ...inputStyle, width: 160 }}
                    />
                    <button type="submit" style={btnStyle('#f1f5f9', '#475569')}>Filter</button>
                    <button type="button" onClick={() => { setFilter(''); load(); }} style={iconBtnStyle}><RefreshCw size={14} /></button>
                </form>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={20} className="animate-spin" color="#94a3b8" /></div>
            ) : logs.length === 0 ? (
                <div style={emptyStyle}>No audit events recorded yet.</div>
            ) : (
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={thStyle}>Time</th>
                                <th style={thStyle}>User</th>
                                <th style={thStyle}>Event</th>
                                <th style={thStyle}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.6rem 1rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', color: '#475569' }}>
                                        {log.user?.name || log.user?.email || '—'}
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem' }}>
                                        <span style={badgeStyle('#f8fafc', eventColor[log.event] || '#475569') as React.CSSProperties}>
                                            {log.event}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.6rem 1rem', color: '#475569' }}>
                                        {log.description || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Session Control Tab ───────────────────────────────────────────────────────

function SessionsTab() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [forceLogoutTarget, setForceLogoutTarget] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => { load(); }, []);

    function load() {
        setLoading(true);
        getActiveSessions().then(data => { setSessions(data); setLoading(false); });
    }

    function handleForceLogout(userId: string) {
        startTransition(async () => {
            await forceLogoutUser(userId);
            load();
        });
    }

    // Group sessions by user
    const byUser = sessions.reduce((acc: Record<string, any>, s) => {
        if (!acc[s.userId]) acc[s.userId] = { user: s.user, sessions: [] };
        acc[s.userId].sessions.push(s);
        return acc;
    }, {});

    function timeSince(date: string) {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Session Control</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Live view of who is signed in. Sessions are recorded from this deployment onward.
                    </p>
                </div>
                <button onClick={load} disabled={loading} style={iconBtnStyle}>
                    <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={20} className="animate-spin" color="#94a3b8" /></div>
            ) : Object.keys(byUser).length === 0 ? (
                <div style={emptyStyle}>
                    No active sessions recorded yet.<br />
                    <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                        Sessions are tracked from the first login after this update was deployed.
                    </span>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.values(byUser).map((entry: any) => {
                        const latest = entry.sessions[0];
                        const sessionCount = entry.sessions.length;
                        return (
                            <div key={entry.user.id} style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ ...avatarStyle, position: 'relative' }}>
                                            {entry.user.name?.[0]?.toUpperCase() || 'U'}
                                            <span style={{
                                                position: 'absolute', bottom: 1, right: 1,
                                                width: 9, height: 9, borderRadius: '50%',
                                                background: '#22c55e', border: '1.5px solid #fff',
                                            }} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{entry.user.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{entry.user.email}</div>
                                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    🕐 Signed in {timeSince(latest.createdAt)}
                                                </span>
                                                {sessionCount > 1 && (
                                                    <span style={badgeStyle('#fffbeb', '#d97706') as React.CSSProperties}>
                                                        {sessionCount} active sessions
                                                    </span>
                                                )}
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    Expires {new Date(latest.expiresAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setForceLogoutTarget({ id: entry.user.id, name: entry.user.name })}
                                        disabled={isPending}
                                        style={{ ...btnStyle('#fef2f2', '#dc2626'), border: '1px solid #fecaca', flexShrink: 0 }}
                                    >
                                        <LogOut size={14} /> Force Logout
                                    </button>
                                </div>

                                {/* Per-session rows when multiple */}
                                {sessionCount > 1 && (
                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                                        {entry.sessions.map((s: any, i: number) => (
                                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', padding: '0.2rem 0' }}>
                                                <span>Session {i + 1} — signed in {timeSince(s.createdAt)}</span>
                                                <span>expires {new Date(s.expiresAt).toLocaleDateString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.5rem' }}>
                Force logout invalidates all sessions instantly. The user is redirected to login on their next page load.
            </p>

            <ConfirmDialog
                open={!!forceLogoutTarget}
                title="Force logout"
                message={`Sign out all active sessions for ${forceLogoutTarget?.name}? They will be redirected to login on their next page load.`}
                confirmLabel="Force Logout"
                danger
                onConfirm={() => { if (forceLogoutTarget) handleForceLogout(forceLogoutTarget.id); setForceLogoutTarget(null); }}
                onCancel={() => setForceLogoutTarget(null)}
            />
        </div>
    );
}

// ─── Activity Log Tab ──────────────────────────────────────────────────────────

const RESOURCE_COLORS: Record<string, { bg: string; color: string }> = {
    BRIEF:      { bg: '#eff6ff', color: '#2563eb' },
    DOCUMENT:   { bg: '#f0fdf4', color: '#16a34a' },
    INVOICE:    { bg: '#fefce8', color: '#ca8a04' },
    PAYMENT:    { bg: '#f0fdf4', color: '#15803d' },
    EXPENSE:    { bg: '#fff7ed', color: '#ea580c' },
    COMPLIANCE: { bg: '#faf5ff', color: '#7c3aed' },
    CLIENT:     { bg: '#f0fdfa', color: '#0d9488' },
    MATTER:     { bg: '#f5f3ff', color: '#6d28d9' },
    COURT_DATE: { bg: '#fff1f2', color: '#e11d48' },
};

const ACTION_LABELS: Record<string, string> = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    DELETED: 'Deleted',
    VIEWED: 'Viewed',
    DOWNLOADED: 'Downloaded',
    UPLOADED: 'Uploaded',
    ACKNOWLEDGED: 'Acknowledged',
};

function ActivityLogTab() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const LIMIT = 50;

    async function load(p = page) {
        setLoading(true);
        try {
            const result = await getActivityLogs(p, LIMIT);
            setLogs(result.logs);
            setTotal(result.total);
            setPage(p);
        } catch {}
        setLoading(false);
    }

    useEffect(() => { load(1); }, []);

    function fmt(dateStr: string) {
        const d = new Date(dateStr);
        return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                    <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Activity Log</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        All workspace actions — briefs, documents, invoices, payments, expenses, compliance.
                    </p>
                </div>
                <button onClick={() => load(1)} disabled={loading} style={iconBtnStyle}>
                    <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={20} className="animate-spin" color="#94a3b8" /></div>
            ) : logs.length === 0 ? (
                <div style={emptyStyle}>
                    No activity recorded yet.<br />
                    <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                        Actions taken on briefs, documents, invoices, payments, and compliance will appear here.
                    </span>
                </div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                    <th style={thStyle}>Time</th>
                                    <th style={thStyle}>User</th>
                                    <th style={thStyle}>Resource</th>
                                    <th style={thStyle}>Action</th>
                                    <th style={thStyle}>Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => {
                                    const rc = RESOURCE_COLORS[log.resource] || { bg: '#f8fafc', color: '#64748b' };
                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '0.6rem 1rem', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                                {fmt(log.createdAt)}
                                            </td>
                                            <td style={{ padding: '0.6rem 1rem' }}>
                                                <div style={{ fontWeight: 500 }}>{log.user?.name || '—'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{log.user?.email}</div>
                                            </td>
                                            <td style={{ padding: '0.6rem 1rem' }}>
                                                <span style={{ ...badgeStyle(rc.bg, rc.color), cursor: 'default' }}>
                                                    {log.resource}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.6rem 1rem', color: '#475569' }}>
                                                {ACTION_LABELS[log.action] || log.action}
                                            </td>
                                            <td style={{ padding: '0.6rem 1rem', color: '#64748b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.resourceName || log.resourceId || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                            <button onClick={() => load(page - 1)} disabled={page <= 1} style={iconBtnStyle}>← Prev</button>
                            <span style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#64748b' }}>
                                Page {page} of {totalPages} ({total} entries)
                            </span>
                            <button onClick={() => load(page + 1)} disabled={page >= totalPages} style={iconBtnStyle}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Deleted Records Tab ──────────────────────────────────────────────────────

function DeletedRecordsTab() {
    const [records, setRecords] = useState<{ briefs: any[]; clients: any[]; matters: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState<'briefs' | 'clients' | 'matters'>('briefs');
    const [isPending, startTransition] = useTransition();
    const [restoring, setRestoring] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    function load() {
        setLoading(true);
        getDeletedRecords().then(data => { setRecords(data); setLoading(false); });
    }

    function handleRestore(type: 'brief' | 'client' | 'matter', id: string) {
        setRestoring(id);
        startTransition(async () => {
            await restoreRecord(type, id);
            setRestoring(null);
            load();
        });
    }

    function fmt(d: string) {
        return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }

    const subTabs: { id: 'briefs' | 'clients' | 'matters'; label: string; count: number }[] = [
        { id: 'briefs', label: 'Briefs', count: records?.briefs.length ?? 0 },
        { id: 'clients', label: 'Clients', count: records?.clients.length ?? 0 },
        { id: 'matters', label: 'Matters', count: records?.matters.length ?? 0 },
    ];

    return (
        <div>
            <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Deleted Records</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Restore soft-deleted briefs, clients, and matters. Records are retained for audit purposes until permanently removed.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                {subTabs.map(st => (
                    <button
                        key={st.id}
                        onClick={() => setSubTab(st.id)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: subTab === st.id ? 600 : 400,
                            color: subTab === st.id ? '#1e293b' : '#64748b',
                            borderBottom: subTab === st.id ? '2px solid #1e293b' : '2px solid transparent',
                            marginBottom: -1,
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}
                    >
                        {st.label}
                        {!loading && st.count > 0 && (
                            <span style={{ ...badgeStyle('#fef2f2', '#dc2626'), fontSize: '0.7rem' }}>{st.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={20} className="animate-spin" color="#94a3b8" /></div>
            ) : (
                <>
                    {subTab === 'briefs' && (
                        !records?.briefs.length ? (
                            <div style={emptyStyle}>No deleted briefs.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {records.briefs.map(b => (
                                    <div key={b.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.customTitle || b.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                {b.briefNumber} · Deleted {fmt(b.deletedAt)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestore('brief', b.id)}
                                            disabled={isPending || restoring === b.id}
                                            style={btnStyle('#f0fdfa', '#0d9488')}
                                        >
                                            {restoring === b.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                                            Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {subTab === 'clients' && (
                        !records?.clients.length ? (
                            <div style={emptyStyle}>No deleted clients.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {records.clients.map(c => (
                                    <div key={c.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                {c.email}{c.company ? ` · ${c.company}` : ''} · Deleted {fmt(c.deletedAt)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestore('client', c.id)}
                                            disabled={isPending || restoring === c.id}
                                            style={btnStyle('#f0fdfa', '#0d9488')}
                                        >
                                            {restoring === c.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                                            Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {subTab === 'matters' && (
                        !records?.matters.length ? (
                            <div style={emptyStyle}>No deleted matters.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {records.matters.map(m => (
                                    <div key={m.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                {m.caseNumber ? `${m.caseNumber} · ` : ''}Deleted {fmt(m.deletedAt)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestore('matter', m.id)}
                                            disabled={isPending || restoring === m.id}
                                            style={btnStyle('#f0fdfa', '#0d9488')}
                                        >
                                            {restoring === m.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                                            Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
}

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '1rem 1.25rem',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: '0.875rem',
    outline: 'none',
    background: '#fff',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 500,
    color: '#64748b',
    marginBottom: '0.3rem',
};

const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '3rem',
    color: '#94a3b8',
    fontSize: '0.875rem',
    background: '#f8fafc',
    borderRadius: 10,
    border: '1px dashed #e2e8f0',
};

const thStyle: React.CSSProperties = {
    padding: '0.6rem 1rem',
    textAlign: 'left',
    fontWeight: 600,
    color: '#64748b',
};

const avatarStyle: React.CSSProperties = {
    width: 36, height: 36,
    borderRadius: '50%',
    background: '#1e293b',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.875rem', fontWeight: 600, flexShrink: 0,
};

const iconBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.35rem 0.65rem',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#f8fafc',
    color: '#475569',
    fontSize: '0.8rem',
    cursor: 'pointer',
};

function btnStyle(bg: string, color: string): React.CSSProperties {
    return {
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.5rem 1rem',
        background: bg, color,
        border: 'none', borderRadius: 7,
        fontSize: '0.875rem', fontWeight: 500,
        cursor: 'pointer',
    };
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
    return {
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.2rem 0.55rem',
        background: bg, color,
        borderRadius: 20,
        fontSize: '0.75rem', fontWeight: 500,
        border: 'none',
        cursor: 'default',
    };
}

// ─── Brief Attribution Tab ────────────────────────────────────────────────────

type BriefRow = {
    id: string;
    name: string;
    ref: string;
    category: string;
    primaryId: string | null;
    primaryName: string | null;
    secondaries: { lawyerId: string; name: string }[];
};

type MemberOption = { id: string; name: string; email: string };

function BriefAttributionTab() {
    const [briefs, setBriefs] = useState<BriefRow[]>([]);
    const [members, setMembers] = useState<MemberOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [savingAll, setSavingAll] = useState(false);
    const [savedAll, setSavedAll] = useState(false);
    const [isPending, startTransition] = useTransition();

    // local edits keyed by briefId
    const [edits, setEdits] = useState<Record<string, { primaryId: string; sec1Id: string; sec2Id: string }>>({});

    useEffect(() => {
        getBriefAttributions().then(data => {
            setBriefs(data.briefs);
            setMembers(data.members);
            // Seed edits from existing attribution
            const init: typeof edits = {};
            data.briefs.forEach(b => {
                init[b.id] = {
                    primaryId: b.primaryId ?? '',
                    sec1Id: b.secondaries[0]?.lawyerId ?? '',
                    sec2Id: b.secondaries[1]?.lawyerId ?? '',
                };
            });
            setEdits(init);
            setLoading(false);
        });
    }, []);

    function handleChange(briefId: string, field: 'primaryId' | 'sec1Id' | 'sec2Id', value: string) {
        setEdits(prev => ({ ...prev, [briefId]: { ...prev[briefId], [field]: value } }));
    }

    function isDirtyBrief(brief: BriefRow) {
        const e = edits[brief.id];
        if (!e) return false;
        return (e.primaryId || '') !== (brief.primaryId || '') ||
            (e.sec1Id || '') !== (brief.secondaries[0]?.lawyerId || '') ||
            (e.sec2Id || '') !== (brief.secondaries[1]?.lawyerId || '');
    }

    function handleSave(briefId: string) {
        const e = edits[briefId];
        if (!e) return;
        setSaving(briefId);
        startTransition(async () => {
            await updateBriefAttribution(briefId, {
                primaryId: e.primaryId || null,
                secondary1Id: e.sec1Id || null,
                secondary2Id: e.sec2Id || null,
            });
            setSaving(null);
            setSaved(briefId);
            setTimeout(() => setSaved(s => s === briefId ? null : s), 2000);
        });
    }

    async function handleSaveAll() {
        const dirtyBriefs = briefs.filter(isDirtyBrief);
        if (dirtyBriefs.length === 0) return;
        setSavingAll(true);
        await Promise.all(dirtyBriefs.map(b => {
            const e = edits[b.id];
            return updateBriefAttribution(b.id, {
                primaryId: e.primaryId || null,
                secondary1Id: e.sec1Id || null,
                secondary2Id: e.sec2Id || null,
            });
        }));
        // Sync local brief state so rows go clean
        setBriefs(prev => prev.map(b => {
            const e = edits[b.id];
            if (!e) return b;
            return {
                ...b,
                primaryId: e.primaryId || null,
                primaryName: members.find(m => m.id === e.primaryId)?.name ?? null,
                secondaries: [e.sec1Id, e.sec2Id].filter(Boolean).map(id => ({
                    lawyerId: id,
                    name: members.find(m => m.id === id)?.name ?? id,
                })),
            };
        }));
        setSavingAll(false);
        setSavedAll(true);
        setTimeout(() => setSavedAll(false), 2500);
    }

    const filtered = briefs.filter(b =>
        !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.ref?.toLowerCase().includes(search.toLowerCase())
    );

    const unattributed = briefs.filter(b => !b.primaryId).length;
    const dirtyCount = briefs.filter(isDirtyBrief).length;

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', padding: '2rem 0' }}>
            <Loader2 size={16} className="animate-spin" /> Loading brief attributions...
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Brief Attribution</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
                        Assign Primary Handler and up to 2 Secondary lawyers for each active brief.
                        {unattributed > 0 && (
                            <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 6 }}>
                                {unattributed} brief{unattributed !== 1 ? 's' : ''} have no primary handler.
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                        type="text"
                        placeholder="Search briefs..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 7,
                            fontSize: 12, outline: 'none', width: 200, color: '#1e293b',
                        }}
                    />
                    <button
                        onClick={handleSaveAll}
                        disabled={dirtyCount === 0 || savingAll || isPending}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 7, border: 'none',
                            fontSize: 12, fontWeight: 700, cursor: dirtyCount > 0 && !savingAll ? 'pointer' : 'default',
                            background: savedAll ? '#f0fdfa' : dirtyCount > 0 ? '#1e293b' : '#f1f5f9',
                            color: savedAll ? '#0d9488' : dirtyCount > 0 ? '#fff' : '#94a3b8',
                            transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                    >
                        {savingAll ? (
                            <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
                        ) : savedAll ? (
                            <><Check size={13} /> All saved</>
                        ) : (
                            <>Save All{dirtyCount > 0 ? ` (${dirtyCount})` : ''}</>
                        )}
                    </button>
                </div>
            </div>

            {/* Scrollable table: sticky header + rows */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
                {/* Sticky column headers */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 175px 175px 175px 72px',
                    gap: 10, padding: '6px 12px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    position: 'sticky', top: 0, zIndex: 2,
                }}>
                    {['Brief No.', 'Brief Name', 'Lawyer 1 (Lead)', 'Lawyer 2', 'Lawyer 3', ''].map(h => (
                        <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {h}
                        </span>
                    ))}
                </div>

            {/* Rows */}
            <div>
                {filtered.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        No briefs match your search.
                    </div>
                )}
                {filtered.map((brief, i) => {
                    const e = edits[brief.id] ?? { primaryId: '', sec1Id: '', sec2Id: '' };
                    const isSaving = saving === brief.id;
                    const isSaved = saved === brief.id;
                    const isDirty =
                        (e.primaryId || '') !== (brief.primaryId || '') ||
                        (e.sec1Id || '') !== (brief.secondaries[0]?.lawyerId || '') ||
                        (e.sec2Id || '') !== (brief.secondaries[1]?.lawyerId || '');

                    return (
                        <div
                            key={brief.id}
                            style={{
                                display: 'grid', gridTemplateColumns: '100px 1fr 175px 175px 175px 72px',
                                gap: 10, padding: '10px 12px', alignItems: 'center',
                                background: i % 2 === 0 ? '#fff' : '#fafafa',
                                borderTop: i > 0 ? '1px solid #f1f5f9' : undefined,
                            }}
                        >
                            {/* Brief number */}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>
                                    {brief.ref || '—'}
                                </div>
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                                    {brief.category}
                                </div>
                            </div>

                            {/* Brief name */}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {brief.name}
                                </div>
                            </div>

                            {/* Primary */}
                            <LawyerSelect
                                value={e.primaryId}
                                members={members}
                                excludeIds={[e.sec1Id, e.sec2Id].filter(Boolean)}
                                placeholder="— No primary —"
                                onChange={v => handleChange(brief.id, 'primaryId', v)}
                                highlight={!e.primaryId}
                            />

                            {/* Secondary 1 */}
                            <LawyerSelect
                                value={e.sec1Id}
                                members={members}
                                excludeIds={[e.primaryId, e.sec2Id].filter(Boolean)}
                                placeholder="— None —"
                                onChange={v => handleChange(brief.id, 'sec1Id', v)}
                            />

                            {/* Secondary 2 */}
                            <LawyerSelect
                                value={e.sec2Id}
                                members={members}
                                excludeIds={[e.primaryId, e.sec1Id].filter(Boolean)}
                                placeholder="— None —"
                                onChange={v => handleChange(brief.id, 'sec2Id', v)}
                            />

                            {/* Save button */}
                            <button
                                onClick={() => handleSave(brief.id)}
                                disabled={!isDirty || isSaving || isPending}
                                style={{
                                    padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                    cursor: isDirty && !isSaving ? 'pointer' : 'default',
                                    border: 'none',
                                    background: isSaved ? '#f0fdfa' : isDirty ? '#1e293b' : '#f1f5f9',
                                    color: isSaved ? '#0d9488' : isDirty ? '#fff' : '#94a3b8',
                                    display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                                }}
                            >
                                {isSaving
                                    ? <><Loader2 size={10} className="animate-spin" /> Saving</>
                                    : isSaved
                                        ? <><Check size={10} strokeWidth={3} /> Saved</>
                                        : 'Save'
                                }
                            </button>
                        </div>
                    );
                })}
            </div>
            </div>{/* end scrollable table */}

            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 10 }}>
                Changes take effect immediately. Each user will see their updated My Briefs on Pulse after saving.
            </p>
        </div>
    );
}

function LawyerSelect({
    value, members, excludeIds, placeholder, onChange, highlight,
}: {
    value: string;
    members: MemberOption[];
    excludeIds: string[];
    placeholder: string;
    onChange: (v: string) => void;
    highlight?: boolean;
}) {
    const available = members.filter(m => !excludeIds.includes(m.id) || m.id === value);
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
                width: '100%', padding: '5px 7px',
                border: `1px solid ${highlight ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: 6, fontSize: 11, color: value ? '#1e293b' : '#94a3b8',
                background: highlight ? '#fff5f5' : '#fff',
                outline: 'none', cursor: 'pointer',
            }}
        >
            <option value="">{placeholder}</option>
            {available.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
            ))}
        </select>
    );
}

// ─── Work Logs Tab ─────────────────────────────────────────────────────────────

const WL_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    PLANNED:     { label: 'Planned',     color: '#475569', bg: '#f1f5f9' },
    IN_PROGRESS: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff' },
    SUBMITTED:   { label: 'Submitted',   color: '#0d9488', bg: '#f0fdfa' },
    COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#ecfdf5' },
    OVERDUE:     { label: 'Overdue',     color: '#dc2626', bg: '#fee2e2' },
};

const WL_PRIORITY_META: Record<string, { label: string; color: string }> = {
    low:    { label: 'Low',    color: '#64748b' },
    medium: { label: 'Medium', color: '#d97706' },
    high:   { label: 'High',   color: '#dc2626' },
};

function WorkLogsTab({ workspaceId }: { workspaceId: string }) {
    const [entries, setEntries] = useState<WorkEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [filterUser, setFilterUser] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [, startTransition] = useTransition();

    useEffect(() => { load(); }, [selectedDate]);

    function load() {
        setLoading(true);
        getTeamWorkLogs(workspaceId, selectedDate).then(data => {
            setEntries(data);
            setLoading(false);
        });
    }

    function handleStatus(id: string, status: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE') {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        startTransition(async () => { await updateWorkEntryStatus(id, status); });
    }

    function handleDelete(id: string) {
        setEntries(prev => prev.filter(e => e.id !== id));
        startTransition(async () => { await deleteWorkEntry(id); });
    }

    const users = Array.from(new Map(entries.map(e => [e.userId, e.user])).values());

    const filtered = entries.filter(e => {
        if (filterUser && e.userId !== filterUser) return false;
        if (filterStatus && e.status !== filterStatus) return false;
        return true;
    });

    // Group by user
    const byUser: Map<string, WorkEntry[]> = new Map();
    for (const e of filtered) {
        const key = e.userId;
        if (!byUser.has(key)) byUser.set(key, []);
        byUser.get(key)!.push(e);
    }

    const completedCount = entries.filter(e => e.status === 'COMPLETED' || e.status === 'SUBMITTED').length;
    const overdueCount = entries.filter(e => e.status === 'OVERDUE').length;
    const submittedUsers = new Set(entries.map(e => e.userId)).size;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 3 }}>Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        style={{ fontSize: 12, padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, color: '#1e293b' }}
                    />
                </div>
                <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 3 }}>Member</label>
                    <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ fontSize: 12, padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, color: '#1e293b' }}>
                        <option value="">All members</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 3 }}>Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 12, padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, color: '#1e293b' }}>
                        <option value="">All statuses</option>
                        {Object.entries(WL_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>
                <button onClick={load} style={{ marginTop: 18, padding: '5px 12px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer' }}>
                    <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} />Refresh
                </button>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total tasks', value: entries.length, color: '#1e293b' },
                    { label: 'Completed', value: completedCount, color: '#059669' },
                    { label: 'Overdue', value: overdueCount, color: overdueCount > 0 ? '#dc2626' : '#94a3b8' },
                    { label: 'Members logged', value: submittedUsers, color: '#2563eb' },
                ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', minWidth: 90 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {loading && <p style={{ color: '#94a3b8', fontSize: 12 }}>Loading…</p>}

            {!loading && filtered.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: 12 }}>No work log entries for this date.</p>
            )}

            {!loading && Array.from(byUser.entries()).map(([uid, userEntries]) => {
                const u = userEntries[0].user;
                const done = userEntries.filter(e => e.status === 'COMPLETED' || e.status === 'SUBMITTED').length;
                return (
                    <div key={uid} style={{ marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                        {/* Member header */}
                        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#064e3b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                    {(u.name || u.email).split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{u.name || u.email}</span>
                            </div>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{done}/{userEntries.length} done</span>
                        </div>

                        {/* Tasks */}
                        <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {userEntries.map(entry => {
                                const sm = WL_STATUS_META[entry.status] || WL_STATUS_META.PLANNED;
                                const pm = WL_PRIORITY_META[entry.priority] || WL_PRIORITY_META.medium;
                                const done = entry.status === 'COMPLETED' || entry.status === 'SUBMITTED';
                                const ref = entry.brief ? (entry.brief.customBriefNumber || entry.brief.briefNumber) : null;
                                return (
                                    <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ color: done ? '#059669' : '#cbd5e1', marginTop: 1 }}>
                                            {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: done ? '#94a3b8' : '#1e293b', textDecoration: done ? 'line-through' : 'none' }}>
                                                {entry.title}
                                            </div>
                                            {entry.description && (
                                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{entry.description}</div>
                                            )}
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: sm.bg, color: sm.color }}>
                                                    {sm.label}
                                                </span>
                                                <span style={{ fontSize: 10, color: pm.color, fontWeight: 500 }}>{pm.label}</span>
                                                {ref && <span style={{ fontSize: 10, color: '#64748b' }}>{ref}</span>}
                                                {entry.dueDate && (
                                                    <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Clock size={10} />
                                                        {new Date(entry.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Status picker */}
                                        <select
                                            value={entry.status}
                                            onChange={e => handleStatus(entry.id, e.target.value as any)}
                                            style={{ fontSize: 10, padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: 5, color: '#1e293b', cursor: 'pointer' }}
                                        >
                                            {Object.entries(WL_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: 2 }}
                                            title="Delete entry"
                                            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                                            onMouseLeave={e => (e.currentTarget.style.color = '#e2e8f0')}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
