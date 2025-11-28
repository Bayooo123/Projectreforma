"use client";

import { X, UploadCloud } from 'lucide-react';
import { useState, useRef } from 'react';
import styles from './BriefUploadModal.module.css';

interface BriefUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BriefUploadModal = ({ isOpen, onClose }: BriefUploadModalProps) => {
    if (!isOpen) return null;

    // Form state
    const [briefNumber, setBriefNumber] = useState('');
    const [briefName, setBriefName] = useState('');
    const [clientName, setClientName] = useState('');
    const [lawyer, setLawyer] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        // Check file type
        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a PDF or DOCX file');
            return;
        }

        // Check file size (25MB max)
        const maxSize = 25 * 1024 * 1024; // 25MB in bytes
        if (file.size > maxSize) {
            alert('File size must be less than 25MB');
            return;
        }

        setSelectedFile(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDropzoneClick = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile) {
            alert('Please select a file to upload');
            return;
        }

        console.log({
            briefNumber,
            briefName,
            clientName,
            lawyer,
            category,
            status,
            file: selectedFile.name
        });

        alert('Brief uploaded successfully!');

        // Reset fields
        setBriefNumber('');
        setBriefName('');
        setClientName('');
        setLawyer('');
        setCategory('');
        setStatus('');
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Upload New Brief</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div
                        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${selectedFile ? styles.hasFile : ''}`}
                        onClick={handleDropzoneClick}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx"
                            onChange={handleFileInputChange}
                            style={{ display: 'none' }}
                        />
                        <UploadCloud size={48} className={styles.uploadIcon} />
                        {selectedFile ? (
                            <>
                                <p className={styles.dropText}>✓ {selectedFile.name}</p>
                                <p className={styles.dropSubtext}>
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB - Click to change
                                </p>
                            </>
                        ) : (
                            <>
                                <p className={styles.dropText}>Drag and drop your PDF here, or click to browse</p>
                                <p className={styles.dropSubtext}>Supports PDF, DOCX (Max 25MB)</p>
                            </>
                        )}
                    </div>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Brief Number</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="e.g. 001"
                                    value={briefNumber}
                                    onChange={e => setBriefNumber(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Brief Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="e.g. Motion for Bail"
                                    value={briefName}
                                    onChange={e => setBriefName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Client Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Stellar Corporation"
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Lawyer in Charge</label>
                            <select
                                className={styles.select}
                                value={lawyer}
                                onChange={e => setLawyer(e.target.value)}
                            >
                                <option value="">Select Lawyer...</option>
                                <option>Professor Abiola Sanni SAN</option>
                                <option>Professor Ndubuisi</option>
                                <option>Kolawole Abudulsalam</option>
                                <option>Iniobong Umob</option>
                                <option>Josephine Ogbinaka</option>
                                <option>Omowunmi Adeoye</option>
                                <option>Maureen Omaegbu</option>
                                <option>Adeola Adeoye</option>
                                <option>Benjamin Adeyanju</option>
                                <option>Adebayo Gbadebo</option>
                                <option>Tosin Omisade</option>
                            </select>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Category</label>
                                <select
                                    className={styles.select}
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                >
                                    <option value="">Select Category...</option>
                                    <option>Litigation</option>
                                    <option>ADR</option>
                                    <option>Tax advisory</option>
                                    <option>Corporate advisory</option>
                                    <option>Academic research</option>
                                    <option>Real estate</option>
                                    <option>Wills and intestate matters</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Status</label>
                                <select
                                    className={styles.select}
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                >
                                    <option value="">Select Status...</option>
                                    <option>Active</option>
                                    <option>Inactive</option>
                                    <option>Finalized</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                            <button type="submit" className={styles.submitBtn}>Upload Brief</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BriefUploadModal;
