"use client";

import { useState } from 'react';
import styles from './PasswordProtected.module.css';

interface PasswordProtectedProps {
    password: string;
    children: React.ReactNode;
}

export default function PasswordProtected({ password, children }: PasswordProtectedProps) {
    const [input, setInput] = useState('');
    const [authorized, setAuthorized] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input === password) {
            setAuthorized(true);
        } else {
            alert('Incorrect password');
        }
        setInput('');
    };

    if (authorized) {
        return <>{children}</>;
    }

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <h2 className={styles.title}>Enter Password</h2>
                <input
                    type="password"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className={styles.input}
                    placeholder="Password"
                    required
                />
                <button type="submit" className={styles.submitBtn}>Enter</button>
            </form>
        </div>
    );
}
