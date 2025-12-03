'use client';

import { useState } from 'react';
import styles from './WelcomeModal.module.css';

interface WelcomeModalProps {
    onClose: () => void;
}

export default function WelcomeModal({ onClose }: WelcomeModalProps) {
    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h1>Welcome to Reforma! 🎉</h1>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h2>Why Reforma Exists</h2>
                        <p>
                            Reforma is designed to revolutionize legal practice management in Nigeria.
                            We understand the challenges law firms face in managing cases, clients,
                            documents, and finances efficiently.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2>What You Can Do</h2>
                        <ul>
                            <li><strong>📋 Manage Matters:</strong> Track all your cases, court dates, and client communications in one place</li>
                            <li><strong>👥 Client Management:</strong> Organize client information and maintain communication history</li>
                            <li><strong>📄 Brief Management:</strong> Upload, organize, and search through legal documents with OCR</li>
                            <li><strong>💰 Financial Tracking:</strong> Generate invoices, track payments, and monitor expenses</li>
                            <li><strong>📊 Analytics:</strong> Get insights into your practice performance</li>
                            <li><strong>🔔 Smart Notifications:</strong> Never miss important deadlines or client follow-ups</li>
                        </ul>
                    </div>

                    <div className={styles.section}>
                        <h2>Get Started</h2>
                        <p>
                            Explore the sidebar to navigate through different sections. Start by adding
                            your first client or matter, and let Reforma help you build a more organized
                            and efficient legal practice.
                        </p>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.closeButton}>
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
}
