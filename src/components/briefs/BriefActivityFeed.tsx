"use client";

import { useEffect, useState } from 'react';
import { Mail, Clock, FileText, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { getBriefActivity, addBriefNote } from '@/lib/briefs'; // Server action
import styles from './BriefActivityFeed.module.css';

interface ActivityLog {
    id: string;
    activityType: string;
    description: string;
    timestamp: Date;
    metadata: any;
    user?: {
        name: string | null;
        email: string | null;
        image: string | null;
    } | null;
}

interface BriefActivityFeedProps {
    briefId: string;
    inboundEmailId: string;
}

export default function BriefActivityFeed({ briefId, inboundEmailId }: BriefActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // Note Input State
    const [newNote, setNewNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // email address format: brief-[inboundEmailId]@reforma.ai (or similar domain)
    // For now, prompt the user to use the configured domain or fallback
    // In production, this domain should be env var.
    const emailDomain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'inbound.reforma.app';
    const emailAddress = `brief-${inboundEmailId}@${emailDomain}`;

    useEffect(() => {
        loadActivity();
    }, [briefId]);

    const loadActivity = async () => {
        setLoading(true);
        try {
            const logs = await getBriefActivity(briefId);
            setActivities(logs as any);
        } catch (error) {
            console.error("Failed to load activity:", error);
        } finally {
            setLoading(false);
        }
    };

    const copyEmail = () => {
        navigator.clipboard.writeText(emailAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsSubmitting(true);
        try {
            const result = await addBriefNote(briefId, newNote);
            if (result.success && 'activity' in result) {
                setNewNote('');
                // Refresh list or Optimistic update
                loadActivity();
            } else {
                alert('Failed to add note');
            }
        } catch (error) {
            console.error('Error adding note:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'email_received': return <Mail size={16} />;
            case 'document_uploaded': return <FileText size={16} />;
            case 'status_changed': return <CheckCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.emailBox}>
                <div className={styles.emailHeader}>
                    <span className={styles.emailLabel}>Updates via Email</span>
                    <span className={styles.emailBadge}>New</span>
                </div>
                <p className={styles.emailExplainer}>
                    Forward emails to <strong>gbadeboadebayo1000@gmail.com</strong> (Reforma will auto-detect the brief) OR CC this unique address:
                </p>
                <div className={styles.copyRow}>
                    <code className={styles.emailCode}>{emailAddress}</code>
                    <button onClick={copyEmail} className={styles.copyBtn}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            <h3 className={styles.feedTitle}>Activity Feed</h3>

            {/* Note Input */}
            <div className={styles.noteInputBox}>
                <textarea
                    className={styles.noteInput}
                    placeholder="Add a note or comment..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    disabled={isSubmitting}
                />
                <div className={styles.noteActions}>
                    <button
                        className={styles.addNoteBtn}
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || isSubmitting}
                    >
                        {isSubmitting ? 'Posting...' : 'Post Note'}
                    </button>
                </div>
            </div>

            <div className={styles.feedList}>
                {loading ? (
                    <div className={styles.loading}>Loading activity...</div>
                ) : activities.length === 0 ? (
                    <div className={styles.empty}>No activity recorded yet.</div>
                ) : (
                    activities.map((log) => (
                        <div key={log.id} className={styles.feedItem}>
                            <div className={`${styles.icon} ${styles[log.activityType] || ''}`}>
                                {getActivityIcon(log.activityType)}
                            </div>
                            <div className={styles.content}>
                                <div className={styles.header}>
                                    <span className={styles.author}>
                                        {log.user?.name || (log.activityType === 'email_received' ? (log.metadata as any)?.emailSender : 'System')}
                                    </span>
                                    <span className={styles.time}>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className={styles.description}>{log.description}</p>

                                {log.activityType === 'email_received' && (log.metadata as any)?.aiAnalysis && (
                                    <div className={styles.aiSummary}>
                                        <strong>AI Summary: </strong>
                                        {(log.metadata as any).aiAnalysis.summary}
                                        {/* Status Update Tag could go here */}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
