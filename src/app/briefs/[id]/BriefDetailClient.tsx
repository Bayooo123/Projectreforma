"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag, User, Building, Calendar, Upload, Loader, FileText, Trash2, Edit, Folder, FolderPlus, FolderInput, CornerUpLeft, Mail, Paperclip, Package } from 'lucide-react';
import { getBriefDisplayTitle, getBriefDisplayNumber } from '@/lib/brief-display';
import DocumentUpload from '@/components/briefs/DocumentUpload';
import DocumentPreview from '@/components/briefs/DocumentPreview';
import EditBriefModal from '@/components/briefs/EditBriefModal';
import CreateFolderModal from '@/components/briefs/CreateFolderModal';
import MoveDocumentModal from '@/components/briefs/MoveDocumentModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import styles from './page.module.css';

interface DocItem {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
    ocrStatus?: string;
    folderId?: string | null;
}

interface Brief {
    id: string;
    briefNumber: string;
    name: string;
    category: string;
    status: string;
    description: string | null;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    isLitigationDerived: boolean;
    customTitle: string | null;
    customBriefNumber: string | null;
    workspaceId: string;
    clientId: string | null;
    matterId: string | null;
    lawyerId: string;
    lawyerInChargeId: string | null;
    client: {
        id: string;
        name: string;
        email: string | null;
        company: string | null;
    } | null;
    lawyer: {
        id: string;
        name: string | null;
        email: string | null;
    };
    lawyerInCharge: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
    matter: {
        id: string;
        name: string;
        caseNumber: string | null;
    } | null;
    folders?: Array<{
        id: string;
        name: string;
        description: string | null;
        parentId: string | null;
        _count?: { documents: number };
    }>;
    documents?: DocItem[];
    workspace: {
        id: string;
        name: string;
    };
    inboundEmailId: string;
}

import { getDocuments, getEmailDocumentsForBrief, getLinkedEmailsForBrief } from '@/app/actions/documents';
import { getFolders, deleteFolder } from '@/app/actions/folders';
import { logBriefViewed, getBriefTimeline, getBriefSummary, TimelineEvent, BriefSummaryData } from '@/app/actions/briefs';
import BriefTimeline from '@/components/briefs/BriefTimeline';

interface BriefDetailClientProps {
    brief: Brief;
}

export default function BriefDetailClient({ brief }: BriefDetailClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [documents, setDocuments] = useState<DocItem[]>([]);
    const [folders, setFolders] = useState<NonNullable<Brief['folders']>>([]);
    const [emailDocs, setEmailDocs] = useState<Awaited<ReturnType<typeof getEmailDocumentsForBrief>>>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [previewDocument, setPreviewDocument] = useState<DocItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [movingDoc, setMovingDoc] = useState<DocItem | null>(null);
    const [deletingFolder, setDeletingFolder] = useState<{ id: string; name: string } | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [docsLoaded, setDocsLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState<'timeline' | 'documents' | 'emails'>(
        searchParams.get('tab') === 'documents' ? 'documents' :
        searchParams.get('tab') === 'emails' ? 'emails' : 'timeline'
    );
    const [linkedEmails, setLinkedEmails] = useState<Awaited<ReturnType<typeof getLinkedEmailsForBrief>>>([]);
    const [emailsLoaded, setEmailsLoaded] = useState(false);
    const [emailsLoading, setEmailsLoading] = useState(false);
    const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

    // Timeline + summary — loaded client-side so SSR only serves the page shell
    const [initialTimeline, setInitialTimeline] = useState<TimelineEvent[]>([]);
    const [initialSummary, setInitialSummary] = useState<BriefSummaryData | null>(null);
    const [timelineLoading, setTimelineLoading] = useState(true);

    useEffect(() => {
        logBriefViewed(brief.id).catch(() => {});
        // Fetch timeline and cached summary in parallel after mount
        Promise.all([
            getBriefTimeline(brief.id),
            getBriefSummary(brief.id),
        ]).then(([timeline, summary]) => {
            setInitialTimeline(timeline);
            setInitialSummary(summary);
        }).finally(() => setTimelineLoading(false));
    }, [brief.id]);

    // Fetch documents/folders lazily — only when the Documents tab is first opened
    const handleTabChange = (tab: 'timeline' | 'documents' | 'emails') => {
        setActiveTab(tab);
        if (tab === 'documents' && !docsLoaded) {
            setDocsLoaded(true);
            refreshData(true);
        }
        if (tab === 'emails' && !emailsLoaded) {
            setEmailsLoaded(true);
            setEmailsLoading(true);
            getLinkedEmailsForBrief(brief.id)
                .then(setLinkedEmails)
                .finally(() => setEmailsLoading(false));
        }
    };

    const refreshData = async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const [newDocs, newFolders, newEmailDocs] = await Promise.all([
                getDocuments(brief.id),
                getFolders(brief.id),
                getEmailDocumentsForBrief(brief.id),
            ]);
            setDocuments(newDocs as any);
            setFolders(newFolders as any);
            setEmailDocs(newEmailDocs);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            if (!silent) setIsRefreshing(false);
        }
    };

    const handleUploadComplete = (newDocs?: any[]) => {
        if (newDocs && newDocs.length > 0) {
            // Optimistic update: Prepend new docs to current list
            setDocuments(prev => [...newDocs, ...prev]);
        }
        refreshData(true);
    };

    const handleDeleteFolder = async (folderId: string) => {
        try {
            const result = await deleteFolder(folderId, brief.id, true);
            if (result.success) {
                if (currentFolderId === folderId) {
                    setCurrentFolderId(null);
                }
                refreshData(true);
            } else {
                alert(result.error || 'Failed to delete folder');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };

    const handleNavigateDocument = (direction: 'prev' | 'next') => {
        if (!previewDocument) return;
        const currentIndex = documents.findIndex(d => d.id === previewDocument.id);
        if (direction === 'prev' && currentIndex > 0) {
            setPreviewDocument(documents[currentIndex - 1]);
        } else if (direction === 'next' && currentIndex < documents.length - 1) {
            setPreviewDocument(documents[currentIndex + 1]);
        }
    };

    const getNavigationState = () => {
        if (!previewDocument) return { prev: false, next: false };
        const currentIndex = documents.findIndex(d => d.id === previewDocument.id);
        return {
            prev: currentIndex > 0,
            next: currentIndex < documents.length - 1
        };
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getOCRStatusBadge = (status?: string) => {
        if (!status || status === 'pending') return <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Pending OCR</span>;

        const badgeStyles: Record<string, string> = {
            processing: 'bg-blue-100 text-blue-700 border-blue-200',
            completed: 'bg-green-100 text-green-700 border-green-200',
            failed: 'bg-red-100 text-red-700 border-red-200'
        };

        const style = badgeStyles[status] || 'bg-gray-100 text-gray-500';

        return (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style} flex items-center gap-1`}>
                {status === 'processing' && <Loader size={8} className="animate-spin" />}
                {status.toUpperCase()}
            </span>
        );
    };

    // Filter view data
    const visibleFolders = useMemo(() => 
        folders.filter(f => currentFolderId === null ? (f.parentId === null) : (f.parentId === currentFolderId)),
    [folders, currentFolderId]);

    const visibleDocuments = useMemo(() => 
        documents.filter(d => (d.folderId || null) === currentFolderId),
    [documents, currentFolderId]);

    const currentFolder = useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId]);

    const [isBundling, setIsBundling] = useState(false);
    const handleDownloadBundle = async () => {
        setIsBundling(true);
        try {
            const resp = await fetch(`/api/v1/briefs/${brief.id}/bundle`);
            if (!resp.ok) throw new Error('Bundle failed');
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${brief.customTitle || brief.name || brief.briefNumber}-bundle.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Failed to generate bundle. Please try again.');
        } finally {
            setIsBundling(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.topRow}>
                    <Link href="/briefs" className={styles.backLink}>
                        <ArrowLeft size={18} />
                        <span>Back to Briefs</span>
                    </Link>
                    <div className={styles.actions}>
                        <button
                            className={styles.draftBtn}
                            onClick={handleDownloadBundle}
                            disabled={isBundling}
                            title="Download brief bundle for playbook preparation"
                        >
                            {isBundling ? <Loader size={16} className="animate-spin" /> : <Package size={16} />}
                            {isBundling ? 'Bundling…' : 'Download Bundle'}
                        </button>
                        <button className={styles.editBtn} onClick={() => setIsEditModalOpen(true)}>
                            <Edit size={16} />
                            Edit Brief
                        </button>
                    </div>
                </div>

                <div className={styles.titleRow}>
                    <h1 className={styles.title}>{getBriefDisplayTitle(brief)}</h1>
                    <span className={`${styles.statusBadge} ${styles[brief.status.toLowerCase()]}`}>
                        {brief.status}
                    </span>
                </div>

                <div className={styles.metaRow}>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Brief Number:</span>
                        <span className={styles.metaValue}>{getBriefDisplayNumber(brief)}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Tag size={14} className={styles.metaIcon} />
                        <span className={styles.metaValue}>{brief.category}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Clock size={14} className={styles.metaIcon} />
                        <span className={styles.metaValue}>
                            Updated {formatDate(brief.updatedAt)}
                        </span>
                    </div>
                </div>

                <div className={styles.compactInfoRow}>
                    <div className={styles.compactInfoItem}>
                        <Building size={14} className={styles.compactIcon} />
                        <span className={styles.compactLabel}>Client:</span>
                        <span className={styles.compactValue}>{brief.client?.name || 'Unassigned'}</span>
                    </div>
                    <div className={styles.compactInfoItem}>
                        <User size={14} className={styles.compactIcon} />
                        <span className={styles.compactLabel}>Lawyer in Charge:</span>
                        <span className={styles.compactValue}>{brief.lawyerInCharge?.name || brief.lawyer?.name || brief.lawyer?.email || 'Unassigned'}</span>
                    </div>
                    {brief.dueDate && (
                        <div className={styles.compactInfoItem}>
                            <Calendar size={14} className={styles.compactIcon} />
                            <span className={styles.compactLabel}>Due:</span>
                            <span className={styles.compactValue}>{formatDate(brief.dueDate)}</span>
                        </div>
                    )}
                </div>

                {brief.description && (
                    <div className={styles.descriptionRow}>
                        <div className={styles.descriptionBox}>
                            <h3 className={styles.descriptionTitle}>Description</h3>
                            <p className={styles.descriptionText}>{brief.description}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.content}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    {(['timeline', 'documents', 'emails'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            style={{
                                padding: '0.6rem 1.25rem',
                                fontSize: 'var(--text-sm)',
                                fontWeight: activeTab === tab ? 600 : 400,
                                color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                marginBottom: '-1px',
                                transition: 'color 0.15s',
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'timeline' && (
                    timelineLoading
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3rem 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            <Loader size={16} className="animate-spin" /> Loading timeline…
                          </div>
                        : <BriefTimeline briefId={brief.id} initialEvents={initialTimeline} initialSummary={initialSummary} />
                )}

                {activeTab === 'documents' && <div style={{ paddingBottom: '80px' }}>
                {/* ── Upload row ─────────────────────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <DocumentUpload briefId={brief.id} folderId={currentFolderId} onUploadComplete={handleUploadComplete} />
                    </div>
                    <button
                        onClick={() => setIsCreateFolderModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer' }}
                    >
                        <FolderPlus size={18} />
                        New Folder
                    </button>
                </div>

                {/* ── Section header ─────────────────────────────────────── */}
                <div className={styles.documentsHeader}>
                    <div className="flex items-center gap-2">
                        <h2 className={styles.documentsTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {currentFolderId !== null && (
                                <button
                                    onClick={() => setCurrentFolderId(currentFolder?.parentId || null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '4px', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
                                    title="Go Back"
                                >
                                    <CornerUpLeft size={16} />
                                </button>
                            )}
                            {currentFolderId === null ? 'Documents' : currentFolder?.name}
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                ({visibleDocuments.length + (currentFolderId === null ? emailDocs.length : 0)} files
                                {visibleFolders.length > 0 ? `, ${visibleFolders.length} folders` : ''})
                            </span>
                        </h2>
                        <button
                            onClick={() => refreshData()}
                            disabled={isRefreshing}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            title="Refresh"
                        >
                            <Loader size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* ── Unified list ───────────────────────────────────────── */}
                {visibleFolders.length === 0 && visibleDocuments.length === 0 && (currentFolderId !== null || emailDocs.length === 0) ? (
                    <div className={styles.emptyState}>
                        <FileText size={48} className={styles.emptyIcon} />
                        <h3 className={styles.emptyTitle}>No documents yet</h3>
                        <p className={styles.emptyText}>Drag and drop files above, or select from your system to get started.</p>
                    </div>
                ) : (
                    <div className={styles.documentsList}>
                        {/* Folders */}
                        {visibleFolders.map((folder) => (
                            <div key={folder.id} className={styles.documentCard} style={{ backgroundColor: 'var(--surface)', cursor: 'pointer' }} onClick={() => setCurrentFolderId(folder.id)}>
                                <div className={styles.documentIcon} style={{ backgroundColor: 'transparent', color: '#6b7280' }}>
                                    <Folder size={24} fill="currentColor" fillOpacity={0.2} />
                                </div>
                                <div className={styles.documentInfo}>
                                    <h4 className={styles.documentName}>{folder.name}</h4>
                                    <div className={styles.documentMeta}>
                                        <span>{folder._count?.documents || 0} files</span>
                                        {folder.description && (
                                            <>
                                                <span>•</span>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{folder.description}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.documentActions} onClick={(e) => e.stopPropagation()}>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={(e) => { e.stopPropagation(); setDeletingFolder({ id: folder.id, name: folder.name }); }}
                                        title="Delete Folder"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Uploaded documents */}
                        {visibleDocuments.map((doc) => (
                            <div key={doc.id} className={styles.documentCard}>
                                <div className={styles.documentIcon}>
                                    <FileText size={24} />
                                </div>
                                <div className={styles.documentInfo}>
                                    <h4 className={styles.documentName}>{doc.name}</h4>
                                    <div className={styles.documentMeta}>
                                        <span>{formatFileSize(doc.size)}</span>
                                        <span>•</span>
                                        <span>{formatDate(doc.uploadedAt)}</span>
                                        <div className="ml-2">{getOCRStatusBadge(doc.ocrStatus)}</div>
                                    </div>
                                </div>
                                <div className={styles.documentActions}>
                                    <button onClick={() => setMovingDoc(doc)} className={styles.viewBtn} style={{ color: 'var(--text-secondary)' }} title="Move">
                                        <FolderInput size={16} />
                                    </button>
                                    <button onClick={() => setPreviewDocument(doc)} className={styles.viewBtn}>View</button>
                                    <button className={styles.deleteBtn}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}

                        {/* Email inbox attachments — shown inline in root only */}
                        {currentFolderId === null && emailDocs.map((att) => (
                            <div key={att.id} className={styles.documentCard}>
                                <div className={styles.documentIcon} style={{ background: '#f0fdfa', color: '#0d9488' }}>
                                    <Paperclip size={22} />
                                </div>
                                <div className={styles.documentInfo}>
                                    <h4 className={styles.documentName} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {att.name}
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#0d9488', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                                            <Mail size={9} style={{ display: 'inline', marginRight: 2 }} />Email
                                        </span>
                                    </h4>
                                    <div className={styles.documentMeta}>
                                        <span>{formatFileSize(att.size)}</span>
                                        <span>•</span>
                                        <span>{formatDate(att.uploadedAt)}</span>
                                        {att.subject && (
                                            <>
                                                <span>•</span>
                                                <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {att.subject}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.documentActions}>
                                    <button
                                        className={styles.viewBtn}
                                        onClick={() => setPreviewDocument({ id: att.id, name: att.name, url: att.url, type: att.type, size: att.size, uploadedAt: att.uploadedAt })}
                                    >
                                        Preview
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>}

                {activeTab === 'emails' && (
                    <div style={{ paddingBottom: '80px' }}>
                        {emailsLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3rem 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                <Loader size={16} className="animate-spin" /> Loading emails…
                            </div>
                        ) : linkedEmails.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                                <Mail size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p style={{ fontWeight: 500 }}>No emails linked to this brief</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    {linkedEmails.length} email{linkedEmails.length !== 1 ? 's' : ''} linked to this brief
                                </p>
                                {linkedEmails.map(email => (
                                    <div
                                        key={email.id}
                                        style={{
                                            border: '1px solid var(--border)',
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            background: 'var(--surface)',
                                        }}
                                    >
                                        {/* Email header — always visible, click to expand */}
                                        <div
                                            onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                                            style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.9rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                                {(email.fromName || email.fromEmail || '?')[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {email.subject || '(No subject)'}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                                        {new Date(email.receivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
                                                </div>
                                                {expandedEmail !== email.id && email.bodyPreview && (
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {email.bodyPreview}
                                                    </div>
                                                )}
                                            </div>
                                            {email.attachmentCount > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                                    <Paperclip size={13} />
                                                    {email.attachmentCount}
                                                </div>
                                            )}
                                        </div>

                                        {/* Expanded body */}
                                        {expandedEmail === email.id && (
                                            <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', background: 'var(--background)' }}>
                                                {email.body ? (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>
                                                        {email.body}
                                                    </div>
                                                ) : email.bodyPreview ? (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{email.bodyPreview}</div>
                                                ) : (
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>No body content available.</p>
                                                )}
                                                {email.attachments.length > 0 && (
                                                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachments</p>
                                                        {email.attachments.map(att => (
                                                            <a
                                                                key={att.id}
                                                                href={att.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', padding: '0.35rem 0.5rem', borderRadius: 6, background: 'var(--hover-bg)' }}
                                                            >
                                                                <Paperclip size={13} />
                                                                {att.name}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <EditBriefModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    router.refresh();
                }}
                brief={brief}
                workspaceId={brief.workspace.id}
            />

            <CreateFolderModal
                isOpen={isCreateFolderModalOpen}
                onClose={() => setIsCreateFolderModalOpen(false)}
                briefId={brief.id}
                parentId={currentFolderId}
                onSuccess={() => {
                    setIsCreateFolderModalOpen(false);
                    refreshData(true);
                }}
            />

            {movingDoc && (
                <MoveDocumentModal
                    isOpen={!!movingDoc}
                    onClose={() => setMovingDoc(null)}
                    briefId={brief.id}
                    documentId={movingDoc.id}
                    documentName={movingDoc.name}
                    currentFolderId={currentFolderId}
                    onSuccess={() => {
                        setMovingDoc(null);
                        refreshData(true);
                    }}
                />
            )}

            <DocumentPreview
                document={previewDocument}
                onClose={() => setPreviewDocument(null)}
                onNavigate={handleNavigateDocument}
                canNavigate={getNavigationState()}
                onVersionSelect={(v) => setPreviewDocument(v)}
            />

            <ConfirmDialog
                open={!!deletingFolder}
                title="Delete folder"
                message={`Delete "${deletingFolder?.name}"? Documents inside will be moved to the main brief.`}
                confirmLabel="Delete"
                danger
                onConfirm={() => { if (deletingFolder) handleDeleteFolder(deletingFolder.id); setDeletingFolder(null); }}
                onCancel={() => setDeletingFolder(null)}
            />
        </div>
    );
}
