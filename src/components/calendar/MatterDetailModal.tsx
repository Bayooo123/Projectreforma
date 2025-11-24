"use client";

import { X, Calendar, User, MapPin, FileText, AlertCircle } from 'lucide-react';
import styles from './MatterDetailModal.module.css';

interface MatterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MatterDetailModal = ({ isOpen, onClose }: MatterDetailModalProps) => {
    if (!isOpen) return null;

    const handleAdjourn = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Save adjournment to database
        // This will update the calendar to show the case on the new date
        alert('Adjournment saved! Case will appear on new date in calendar.');
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>State v. Johnson</h2>
                        <span className={styles.subtitle}>ID/1234/2025</span>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                            <Calendar size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Current Date</span>
                                <p className={styles.value}>Oct 15, 2025</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <MapPin size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Court</span>
                                <p className={styles.value}>High Court Lagos</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <User size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Judge</span>
                                <p className={styles.value}>Hon. Justice Cole</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <User size={16} className={styles.icon} />
                            <div>
                                <span className={styles.label}>Lawyer</span>
                                <p className={styles.value}>Tariq Audu</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <FileText size={16} /> Summary of Proceedings
                        </h3>
                        <textarea
                            className={styles.textarea}
                            placeholder="Enter what happened in court today..."
                            rows={3}
                            defaultValue="The matter came up for hearing of the Defendant's motion for bail. Prosecution counsel was absent."
                        />
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <AlertCircle size={16} /> Observations
                        </h3>
                        <textarea
                            className={styles.textarea}
                            placeholder="Any important observations or notes..."
                            rows={2}
                            defaultValue="Judge seemed inclined to grant bail but insisted on strict surety requirements."
                        />
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Calendar size={16} /> Adjournment Details
                        </h3>
                        <form onSubmit={handleAdjourn} className={styles.adjournForm}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Adjourned To</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Adjourned For</label>
                                    <select className={styles.select} required>
                                        <option value="">Select purpose...</option>
                                        <option value="ruling">Ruling</option>
                                        <option value="judgment">Judgment</option>
                                        <option value="hearing">Hearing</option>
                                        <option value="further_arguments">Further Arguments</option>
                                        <option value="mention">Mention</option>
                                        <option value="adoption">Adoption of Address</option>
                                        <option value="cross_examination">Cross Examination</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className={styles.adjournBtn}>
                                Save Adjournment
                            </button>
                        </form>
                    </div>

                    <div className={styles.statusSection}>
                        <div className={styles.statusItem}>
                            <span className={styles.label}>Current Status</span>
                            <span className={styles.statusBadge}>Adjourned</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatterDetailModal;

