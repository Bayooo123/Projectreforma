"use client";

import { useState } from 'react';
import { X, Mail, UserPlus, Loader2 } from 'lucide-react';
import styles from './InviteTeamModal.module.css';
import { ROLES } from '@/lib/roles';

interface InviteTeamModalProps {
    workspaceId: string;
    workspaceName: string;
    onClose: () => void;
}

const InviteTeamModal = ({ workspaceId, workspaceName, onClose }: InviteTeamModalProps) => {
    const [emails, setEmails] = useState(['']);
    const [role, setRole] = useState('Associate');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const addEmailField = () => {
        setEmails([...emails, '']);
    };

    const removeEmailField = (index: number) => {
        if (emails.length > 1) {
            setEmails(emails.filter((_, i) => i !== index));
        }
    };

    const updateEmail = (index: number, value: string) => {
        const newEmails = [...emails];
        newEmails[index] = value;
        setEmails(newEmails);
    };

    const validateEmails = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmails = emails.filter(email => email.trim() && emailRegex.test(email.trim()));

        if (validEmails.length === 0) {
            setError('Please enter at least one valid email address.');
            return false;
        }

        return validEmails;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const validEmails = validateEmails();
        if (!validEmails) return;

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/invitations/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workspaceId,
                    emails: validEmails,
                    role,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send invitations');
            }

            setSuccess(`Successfully sent ${validEmails.length} invitation${validEmails.length > 1 ? 's' : ''}!`);

            // Reset form after 2 seconds and close modal
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send invitations');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.iconWrapper}>
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h2 className={styles.title}>Invite Team Members</h2>
                            <p className={styles.subtitle}>
                                Invite colleagues to join {workspaceName}
                            </p>
                        </div>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email Addresses</label>
                        {emails.map((email, index) => (
                            <div key={index} className={styles.emailInputGroup}>
                                <div className={styles.inputWrapper}>
                                    <Mail size={18} className={styles.inputIcon} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => updateEmail(index, e.target.value)}
                                        placeholder="colleague@lawfirm.com"
                                        className={styles.input}
                                    />
                                </div>
                                {emails.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeEmailField(index)}
                                        className={styles.removeButton}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addEmailField}
                            className={styles.addButton}
                        >
                            + Add another email
                        </button>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="role" className={styles.label}>
                            Role
                        </label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className={styles.select}
                        >
                            {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <p className={styles.hint}>
                            Team members will be assigned this role when they join
                        </p>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className={styles.success}>
                            {success}
                        </div>
                    )}

                    <div className={styles.footer}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.cancelButton}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className={styles.spinner} size={18} />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail size={18} />
                                    Send Invitations
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteTeamModal;
