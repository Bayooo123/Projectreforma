"use client";

import { X } from 'lucide-react';
import { BriefActivityLogInput } from '@/components/briefs/BriefActivityLogInput';
import styles from './BriefUploadModal.module.css'; // Reusing existing modal styles

interface BriefActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    brief: { id: string; name: string } | null;
}

export default function BriefActivityModal({ isOpen, onClose, brief }: BriefActivityModalProps) {
    if (!isOpen || !brief) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: '500px' }}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Add Activity Log</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-sm text-slate-500">
                            Adding log for: <span className="font-semibold text-slate-800">{brief.name}</span>
                        </p>
                    </div>

                    <BriefActivityLogInput briefId={brief.id} />

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
