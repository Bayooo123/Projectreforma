"use client";

import { X, Gavel } from 'lucide-react';
import styles from './AddMatterModal.module.css';

interface AddMatterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddMatterModal = ({ isOpen, onClose }: AddMatterModalProps) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Add New Matter</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <form className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Name of Matter</label>
                            <input type="text" className={styles.input} placeholder="e.g. State v. Johnson" />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Case Number</label>
                                <input type="text" className={styles.input} placeholder="e.g. ID/1234/2025" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Date</label>
                                <input type="date" className={styles.input} />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Court</label>
                            <select className={styles.select}>
                                <option>High Court of Lagos State</option>
                                <option>Federal High Court</option>
                                <option>Court of Appeal</option>
                                <option>Supreme Court</option>
                                <option>Magistrate Court</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Presiding Judge</label>
                            <input type="text" className={styles.input} placeholder="e.g. Hon. Justice A.B. Cole" />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Lawyer Assigned</label>
                            <select className={styles.select}>
                                <option>Select Lawyer...</option>
                                <option>Tariq Audu</option>
                                <option>Onyeka Chioma</option>
                                <option>Yemisi Grace</option>
                            </select>
                        </div>
                    </form>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    <button className={styles.submitBtn}>
                        <Gavel size={16} />
                        <span>Add Matter</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMatterModal;
