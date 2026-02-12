"use client";

import React from 'react';
import styles from './LoadingIndicator.module.css';

interface LoadingIndicatorProps {
    message?: string;
    centered?: boolean;
}

const LoadingIndicator = ({ message = "Loading...", centered = true }: LoadingIndicatorProps) => {
    return (
        <div className={`${styles.container} ${centered ? styles.centered : ''}`}>
            <div className={styles.spinnerWrapper}>
                <div className={styles.spinner}></div>
                <div className={styles.pulse}></div>
            </div>
            {message && <p className={styles.message}>{message}</p>}
        </div>
    );
};

export default LoadingIndicator;
