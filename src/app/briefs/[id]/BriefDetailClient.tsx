"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag, User, Building, Calendar, Upload, Loader, FileText, Trash2, Edit, Sparkles, Folder, FolderPlus, FolderInput, CornerUpLeft } from 'lucide-react';
import { getBriefDisplayTitle, getBriefDisplayNumber } from '@/lib/brief-display';
import DocumentUpload from '@/components/briefs/DocumentUpload';
import DocumentPreview from '@/components/briefs/DocumentPreview';
import EditBriefModal from '@/components/briefs/EditBriefModal';
import CreateFolderModal from '@/components/briefs/CreateFolderModal';
import MoveDocumentModal from '@/components/briefs/MoveDocumentModal';
import styles from './page.module.css';

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
    summary: string | null;
    lastSummarizedAt: Date | null;
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
    documents: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
        uploadedAt: Date;
        ocrStatus?: string;
        folderId?: string | null;
    }>;
    workspace: {
        id: string;
        name: string;
    };
    inboundEmailId: string;
}

interface BriefDetailClientProps {
    brief: Brief;
}

import { getDocuments } from '@/app/actions/documents';
import { getFolders, deleteFolder } from '@/app/actions/folders';
import { summarizeBrief } from '@/app/actions/briefs';

export default function BriefDetailClient({ brief }: BriefDetailClientProps) {
    const router = useRouter();
    const [documents, setDocuments] = useState(brief.documents);
    const [folders, setFolders] = useState(brief.folders || []);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [previewDocument, setPreviewDocument] = useState<typeof documents[0] | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [movingDoc, setMovingDoc] = useState<typeof documents[0] | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [summary, setSummary] = useState<string | null>(brief.summary);
    const [isSummarizing, setIsSummarizing] = useState(false);

    const refreshData = async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const [newDocs, newFolders] = await Promise.all([
                getDocuments(brief.id),
                getFolders(brief.id)
            ]);
            setDocuments(newDocs as any);
            setFolders(newFolders as any);
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

    const handleSummarize = async () => {
        setIsSummarizing(true);
        try {
            const result = await summarizeBrief(brief.id);
            if (result.success && result.summary) {
                setSummary(result.summary);
            } else {
                console.error('Summarization failed:', result.error);
            }
        } catch (err) {
            console.error('Error in summarization:', err);
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleDeleteFolder = async (folderId: string, folderName: string) => {
        if (!confirm(`Are you sure you want to delete the folder "${folderName}"?\nNote: Documents inside will be moved to the main brief.`)) return;

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
                            className={styles.summarizeBtn} 
                            onClick={handleSummarize}
                            disabled={isSummarizing}
                        >
                            {isSummarizing ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {isSummarizing ? 'Summarizing...' : 'Summarize with AI'}
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

                {(brief.description || summary) && (
                    <div className={styles.descriptionRow}>
                        {brief.description && (
                            <div className={styles.descriptionBox}>
                                <h3 className={styles.descriptionTitle}>Description</h3>
                                <p className={styles.descriptionText}>{brief.description}</p>
                            </div>
                        )}
                        {summary && (
                            <div className={styles.summaryBox}>
                                <div className={styles.summaryHeader}>
                                    <Sparkles size={14} className={styles.summaryIcon} />
                                    <h3 className={styles.summaryTitle}>AI Intelligence Summary</h3>
                                </div>
                                <div className={styles.summaryText}>
                                    {summary.split('\n').map((line, i) => (
                                        <p key={i} className="mb-2">{line}</p>
                                    ))}
                                </div>
                                {brief.lastSummarizedAt && (
                                    <span className={styles.summaryTime}>
                                        Last updated: {formatDate(brief.lastSummarizedAt)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.content}>
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
                            {currentFolderId === null ? 'Main Brief Files' : currentFolder?.name} 
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({visibleDocuments.length} docs, {visibleFolders.length} folders)</span>
                        </h2>
                        <button
                            onClick={() => refreshData()}
                            disabled={isRefreshing}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            title="Refresh List"
                        >
                            <Loader size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {visibleFolders.length === 0 && visibleDocuments.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FileText size={48} className={styles.emptyIcon} />
                        <h3 className={styles.emptyTitle}>This location is empty</h3>
                        <p className={styles.emptyText}>
                            Upload documents or create folders to keep everything organized.
                        </p>
                    </div>
                ) : (
                    <div className={styles.documentsList}>
                        {/* Render Folders First */}
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFolder(folder.id, folder.name);
                                        }}
                                        title="Delete Folder"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Render Documents */}
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
                                        <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                                        <div className="ml-2">
                                            {getOCRStatusBadge(doc.ocrStatus)}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.documentActions}>
                                    <button
                                        onClick={() => setMovingDoc(doc)}
                                        className={styles.viewBtn} style={{ color: 'var(--text-secondary)' }}
                                        title="Move Document"
                                    >
                                        <FolderInput size={16} style={{ marginRight: '4px', display: 'inline' }} />
                                    </button>
                                    <button
                                        onClick={() => setPreviewDocument(doc)}
                                        className={styles.viewBtn}
                                    >
                                        View
                                    </button>
                                    <button className={styles.deleteBtn}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
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
            />
        </div>
    );
}
