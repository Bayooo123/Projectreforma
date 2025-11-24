"use client";

import { X, UploadCloud } from 'lucide-react';
import styles from './BriefUploadModal.module.css';

interface BriefUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BriefUploadModal = ({ isOpen, onClose }: BriefUploadModalProps) => {
    if (!isOpen) return null;

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
                    <div className={styles.dropzone}>
                        <UploadCloud size={48} className={styles.uploadIcon} />
                        <p className={styles.dropText}>Drag and drop your PDF here, or click to browse</p>
                        <p className={styles.dropSubtext}>Supports PDF, DOCX (Max 25MB)</p>
                    </div>

                    <form className={styles.form}>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Brief Number</label>
                                <input type="text" className={styles.input} placeholder="e.g. 001" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Brief Name</label>
                                <input type="text" className={styles.input} placeholder="e.g. Motion for Bail" />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Client Name</label>
                            <input type="text" className={styles.input} placeholder="e.g. Stellar Corporation" />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Lawyer in Charge</label>
                            <select className={styles.select}>
                                <option>Select Lawyer...</option>
                                <option>Tariq Audu</option>
                                <option>Onyeka Chioma</option>
                                <option>Yemisi Grace</option>
                            </select>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Category</label>
                                <select className={styles.select}>
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
                                <select className={styles.select}>
                                    <option>Active</option>
                                    <option>Inactive</option>
                                    <option>Finalized</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    <button className={styles.submitBtn}>Upload Brief</button>
                </div>
            </div>
        </div>
    );
};

export default BriefUploadModal;
