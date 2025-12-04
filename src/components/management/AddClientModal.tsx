"use client";

import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { createClient } from '@/app/actions/clients';
import styles from './AddClientModal.module.css';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    onSuccess: () => void;
}

const INDUSTRIES = [
    'Technology',
    'Finance',
    'Real Estate',
    'Healthcare',
    'Manufacturing',
    'Retail',
    'Logistics',
    'Energy',
    'Telecommunications',
    'Entertainment',
    'Education',
    'Other',
];

export default function AddClientModal({
    isOpen,
    onClose,
    workspaceId,
    onSuccess,
}: AddClientModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        industry: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name.trim()) {
            setError('Client name is required');
            return;
        }

        if (!formData.email.trim()) {
            setError('Email is required');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createClient({
                ...formData,
                workspaceId,
            });

            if (result.success) {
                // Reset form
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    industry: '',
                });
                onSuccess();
                onClose();
            } else {
                setError(result.error || 'Failed to create client');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                industry: '',
            });
            setError('');
            onClose();
        }
    };

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Add New Client</h2>
                        <p className={styles.subtitle}>Create a new client record</p>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Client Name <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g., John Doe or Stellar Corporation"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            disabled={isSubmitting}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Email Address <span className={styles.required}>*</span>
                        </label>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="client@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={isSubmitting}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Phone Number</label>
                        <input
                            type="tel"
                            className={styles.input}
                            placeholder="+234 XXX XXX XXXX"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Company Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g., Stellar Corporation"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Industry</label>
                        <select
                            className={styles.select}
                            value={formData.industry}
                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            disabled={isSubmitting}
                        >
                            <option value="">Select industry...</option>
                            {INDUSTRIES.map((industry) => (
                                <option key={industry} value={industry}>
                                    {industry}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader size={16} className="spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Client'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
