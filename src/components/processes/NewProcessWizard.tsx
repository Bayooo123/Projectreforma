'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader, CheckCircle, AlertCircle, Search, Plus, ArrowRight, ScrollText } from 'lucide-react';
import styles from './NewProcessWizard.module.css';
import { createMatter, getMattersForWorkspace } from '@/app/actions/matters';
import { createProcess, type ProcessDocumentResult } from '@/app/actions/processes';

type MatterSummary = Awaited<ReturnType<typeof getMattersForWorkspace>>[number];

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

interface UploadingFile {
    id: string;
    name: string;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
    blobUrl?: string;
    contentType?: string;
    size?: number;
}

type Step = 'suit' | 'upload' | 'result';

export default function NewProcessWizard({ workspaceId, userId, initialMatters }: { workspaceId: string; userId: string; initialMatters: MatterSummary[] }) {
    const router = useRouter();
    const [step, setStep] = useState<Step>('suit');

    // Step 1 — suit selection
    const [matters, setMatters] = useState(initialMatters);
    const [search, setSearch] = useState('');
    const [selectedMatterId, setSelectedMatterId] = useState('');
    const [showNewSuit, setShowNewSuit] = useState(false);
    const [newSuitName, setNewSuitName] = useState('');
    const [newSuitCaseNumber, setNewSuitCaseNumber] = useState('');
    const [newSuitCourt, setNewSuitCourt] = useState('');
    const [newSuitJudge, setNewSuitJudge] = useState('');
    const [creatingSuit, setCreatingSuit] = useState(false);
    const [suitError, setSuitError] = useState('');

    // Step 2 — upload
    const [dragActive, setDragActive] = useState(false);
    const [queue, setQueue] = useState<UploadingFile[]>([]);
    const [uploading, setUploading] = useState(false);

    // Step 3 — proceed / result
    const [proceeding, setProceeding] = useState(false);
    const [proceedError, setProceedError] = useState('');
    const [result, setResult] = useState<{ briefId: string; briefNumber: string; matterName: string; documents: ProcessDocumentResult[]; affidavitCount: number } | null>(null);

    const filteredMatters = useMemo(() => {
        if (!search.trim()) return matters;
        const q = search.toLowerCase();
        return matters.filter(m => m.name.toLowerCase().includes(q) || m.caseNumber?.toLowerCase().includes(q));
    }, [matters, search]);

    const selectedMatter = matters.find(m => m.id === selectedMatterId);

    const handleSelectExisting = (id: string) => {
        setSelectedMatterId(id);
        setStep('upload');
    };

    const handleCreateSuit = async () => {
        if (!newSuitName.trim()) {
            setSuitError('Suit name is required');
            return;
        }
        setCreatingSuit(true);
        setSuitError('');
        try {
            const res = await createMatter({
                workspaceId,
                userId,
                name: newSuitName,
                caseNumber: newSuitCaseNumber || undefined,
                court: newSuitCourt || undefined,
                judge: newSuitJudge || undefined,
            });
            if (res.success && res.data) {
                setMatters(prev => [{ id: res.data.id, name: res.data.name, caseNumber: res.data.caseNumber, court: res.data.court, judge: res.data.judge, calendarEntries: [] }, ...prev]);
                setSelectedMatterId(res.data.id);
                setShowNewSuit(false);
                setStep('upload');
            } else {
                setSuitError(res.error || 'Failed to create suit');
            }
        } catch (err) {
            setSuitError(err instanceof Error ? err.message : 'Failed to create suit');
        } finally {
            setCreatingSuit(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.length) uploadFiles(Array.from(e.dataTransfer.files));
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) uploadFiles(Array.from(e.target.files));
        e.target.value = '';
    };

    const uploadFiles = async (files: File[]) => {
        setUploading(true);
        const items: UploadingFile[] = files.map(f => ({ id: `${Date.now()}-${f.name}`, name: f.name, status: 'uploading' }));
        setQueue(prev => [...prev, ...items]);

        const { upload } = await import('@vercel/blob/client');

        await Promise.all(files.map(async (file, i) => {
            const id = items[i].id;
            try {
                if (!ALLOWED_TYPES.includes(file.type)) {
                    throw new Error('Unsupported type — PDF, Word, JPEG, or PNG only');
                }
                const blob = await upload(`${Date.now()}-${file.name}`, file, {
                    access: 'public',
                    handleUploadUrl: '/api/upload/handle',
                });
                setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'completed' as const, blobUrl: blob.url, contentType: file.type, size: file.size } : q));
            } catch (err) {
                setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' } : q));
            }
        }));

        setUploading(false);
    };

    const readyFiles = queue.filter(q => q.status === 'completed' && q.blobUrl);

    const handleProceed = async () => {
        if (!selectedMatterId || readyFiles.length === 0) return;
        setProceeding(true);
        setProceedError('');
        try {
            const res = await createProcess({
                matterId: selectedMatterId,
                files: readyFiles.map(f => ({
                    fileName: f.name,
                    blobUrl: f.blobUrl!,
                    contentType: f.contentType!,
                    size: f.size!,
                })),
            });
            if (res.success) {
                setResult(res);
                setStep('result');
            } else {
                setProceedError(res.error);
            }
        } catch (err) {
            setProceedError(err instanceof Error ? err.message : 'Failed to process the bundle');
        } finally {
            setProceeding(false);
        }
    };

    return (
        <div className={styles.wizard}>
            <div className={styles.header}>
                <h1 className={styles.title}>New Process</h1>
                <p className={styles.subtitle}>File a bundle of documents against a suit — affidavits are recognised automatically.</p>
            </div>

            <div className={styles.steps}>
                <span className={step === 'suit' ? styles.stepActive : styles.stepDone}>1. Select Suit</span>
                <ArrowRight size={14} className={styles.stepArrow} />
                <span className={step === 'upload' ? styles.stepActive : (step === 'result' ? styles.stepDone : styles.stepPending)}>2. Upload Bundle</span>
                <ArrowRight size={14} className={styles.stepArrow} />
                <span className={step === 'result' ? styles.stepActive : styles.stepPending}>3. Proceed</span>
            </div>

            {step === 'suit' && (
                <div className={styles.panel}>
                    {!showNewSuit ? (
                        <>
                            <div className={styles.searchRow}>
                                <div className={styles.searchBox}>
                                    <Search size={15} color="var(--text-secondary)" />
                                    <input
                                        className={styles.searchInput}
                                        placeholder="Search existing suits by name or case number..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <button type="button" className={styles.newSuitBtn} onClick={() => setShowNewSuit(true)}>
                                    <Plus size={14} /> New Suit
                                </button>
                            </div>

                            <div className={styles.matterList}>
                                {filteredMatters.length === 0 ? (
                                    <p className={styles.emptyHint}>No matching suits. Create a new one instead.</p>
                                ) : filteredMatters.map(m => (
                                    <button key={m.id} type="button" className={styles.matterRow} onClick={() => handleSelectExisting(m.id)}>
                                        <div>
                                            <div className={styles.matterName}>{m.name}</div>
                                            <div className={styles.matterMeta}>
                                                {m.caseNumber && <span>{m.caseNumber}</span>}
                                                {m.court && <span> · {m.court}</span>}
                                            </div>
                                        </div>
                                        <ArrowRight size={16} color="var(--text-secondary)" />
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className={styles.newSuitForm}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Suit Name *</label>
                                <input className={styles.input} value={newSuitName} onChange={e => setNewSuitName(e.target.value)} placeholder="e.g. Adekunle v. Femi Holdings Ltd" />
                            </div>
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Case Number</label>
                                    <input className={styles.input} value={newSuitCaseNumber} onChange={e => setNewSuitCaseNumber(e.target.value)} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Court</label>
                                    <input className={styles.input} value={newSuitCourt} onChange={e => setNewSuitCourt(e.target.value)} />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Judge</label>
                                <input className={styles.input} value={newSuitJudge} onChange={e => setNewSuitJudge(e.target.value)} />
                            </div>
                            {suitError && <p className={styles.errorText}>{suitError}</p>}
                            <div className={styles.formActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowNewSuit(false)} disabled={creatingSuit}>Cancel</button>
                                <button type="button" className={styles.primaryBtn} onClick={handleCreateSuit} disabled={creatingSuit}>
                                    {creatingSuit ? <Loader size={14} className={styles.spin} /> : 'Create Suit & Continue'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {step === 'upload' && (
                <div className={styles.panel}>
                    <div className={styles.selectedSuitBanner}>
                        Filing against: <strong>{selectedMatter?.name}</strong>
                        <button type="button" className={styles.changeSuitBtn} onClick={() => setStep('suit')}>Change</button>
                    </div>

                    <div
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        className={dragActive ? styles.dropzoneActive : styles.dropzone}
                    >
                        {queue.length > 0 ? (
                            <div className={styles.fileQueue}>
                                {queue.map(f => (
                                    <div key={f.id} className={styles.fileRow}>
                                        <div className={styles.fileRowLeft}>
                                            <FileText size={14} color="var(--text-secondary)" />
                                            <span className={styles.fileName}>{f.name}</span>
                                        </div>
                                        {f.status === 'uploading' && <Loader size={14} className={styles.spin} color="var(--primary)" />}
                                        {f.status === 'completed' && <CheckCircle size={14} color="#059669" />}
                                        {f.status === 'error' && <span title={f.error}><AlertCircle size={14} color="#dc2626" /></span>}
                                    </div>
                                ))}
                                <label className={styles.addMoreLabel}>
                                    <input type="file" multiple onChange={handleFileInput} disabled={uploading} accept=".pdf,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} />
                                    <Plus size={13} /> Add more files
                                </label>
                            </div>
                        ) : (
                            <>
                                <Upload size={24} color="var(--text-secondary)" />
                                <p className={styles.dropHint}>Drag the full document bundle here, or</p>
                                <label className={styles.selectFilesBtn}>
                                    <input type="file" multiple onChange={handleFileInput} disabled={uploading} accept=".pdf,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} />
                                    Select files
                                </label>
                                <p className={styles.dropTypes}>PDF, Word (.docx), JPEG, or PNG</p>
                            </>
                        )}
                    </div>

                    {proceedError && <p className={styles.errorText}>{proceedError}</p>}

                    <div className={styles.formActions}>
                        <button type="button" className={styles.cancelBtn} onClick={() => setStep('suit')} disabled={proceeding}>Back</button>
                        <button type="button" className={styles.primaryBtn} onClick={handleProceed} disabled={proceeding || uploading || readyFiles.length === 0}>
                            {proceeding ? <Loader size={14} className={styles.spin} /> : `Proceed with ${readyFiles.length || ''} document${readyFiles.length === 1 ? '' : 's'}`}
                        </button>
                    </div>
                </div>
            )}

            {step === 'result' && result && (
                <div className={styles.panel}>
                    <div className={styles.resultHeader}>
                        <CheckCircle size={20} color="#059669" />
                        <div>
                            <div className={styles.resultTitle}>Process filed under {result.matterName}</div>
                            <div className={styles.matterMeta}>Brief {result.briefNumber} created</div>
                        </div>
                    </div>

                    <div className={styles.docResults}>
                        {result.documents.map((doc, i) => (
                            <div key={i} className={styles.docRow}>
                                <div className={styles.fileRowLeft}>
                                    <FileText size={14} color="var(--text-secondary)" />
                                    <span className={styles.fileName}>{doc.fileName}</span>
                                </div>
                                <span className={doc.isAffidavit ? styles.badgeAffidavit : styles.badgeType}>
                                    {doc.isAffidavit && <ScrollText size={12} />} {doc.docType}
                                </span>
                            </div>
                        ))}
                    </div>

                    {result.affidavitCount > 0 && (
                        <p className={styles.affidavitNote}>
                            {result.affidavitCount} document{result.affidavitCount === 1 ? '' : 's'} recognised as {result.affidavitCount === 1 ? 'an affidavit' : 'affidavits'} — routing to Oathlify for notarization isn&apos;t wired up yet, so these stay here until that integration ships.
                        </p>
                    )}

                    <div className={styles.formActions}>
                        <button type="button" className={styles.primaryBtn} onClick={() => router.push(`/briefs/${result.briefId}`)}>
                            View Brief
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
