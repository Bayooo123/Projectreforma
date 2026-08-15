'use client';

import { useState } from 'react';
import { Upload, FileText, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { recordManualUploads } from '@/app/actions/inbox';

interface UploadingFile {
    id: string;
    name: string;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
}

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

export default function BulkUploadDropzone({ workspaceId, onUploaded }: { workspaceId: string; onUploaded: () => void }) {
    const [dragActive, setDragActive] = useState(false);
    const [queue, setQueue] = useState<UploadingFile[]>([]);
    const [busy, setBusy] = useState(false);

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
        setBusy(true);
        const items: UploadingFile[] = files.map(f => ({ id: `${Date.now()}-${f.name}`, name: f.name, status: 'uploading' }));
        setQueue(prev => [...prev, ...items]);

        const { upload } = await import('@vercel/blob/client');
        const recorded: { fileName: string; blobUrl: string; contentType: string; size: number }[] = [];

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
                recorded.push({ fileName: file.name, blobUrl: blob.url, contentType: file.type, size: file.size });
                setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'completed' as const } : q));
            } catch (err) {
                setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' } : q));
            }
        }));

        if (recorded.length > 0) {
            await recordManualUploads(workspaceId, recorded);
            onUploaded();
        }

        setTimeout(() => { setBusy(false); setQueue([]); }, 2500);
    };

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
                border: `1.5px dashed ${dragActive ? '#0d9488' : '#e5e7eb'}`,
                borderRadius: 10, padding: '1.25rem', textAlign: 'center',
                background: dragActive ? '#f0fdfa' : '#fafafa', marginBottom: '1rem',
            }}
        >
            {queue.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left', maxWidth: 420, margin: '0 auto' }}>
                    {queue.map(f => (
                        <div key={f.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.4rem 0.6rem', borderRadius: 6, background: '#fff', border: '1px solid #e5e7eb',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <FileText size={13} color="#9ca3af" />
                                <span style={{ fontSize: '0.75rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                            </div>
                            {f.status === 'uploading' && <Loader size={13} className="rm-spin" color="#0d9488" />}
                            {f.status === 'completed' && <CheckCircle size={13} color="#059669" />}
                            {f.status === 'error' && <span title={f.error}><AlertCircle size={13} color="#dc2626" /></span>}
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <Upload size={22} color="#9ca3af" style={{ marginBottom: '0.4rem' }} />
                    <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '0 0 0.5rem' }}>
                        Drag documents here, or upload several at once without picking a brief yet — sort them below afterward.
                    </p>
                    <label style={{
                        display: 'inline-flex', padding: '0.4rem 0.9rem', borderRadius: 6,
                        background: '#0d9488', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    }}>
                        <input type="file" multiple onChange={handleFileInput} disabled={busy} accept=".pdf,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} />
                        Select files
                    </label>
                    <p style={{ fontSize: '0.66rem', color: '#9ca3af', margin: '0.5rem 0 0' }}>PDF, Word (.docx), JPEG, or PNG</p>
                </>
            )}
        </div>
    );
}
