"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <h1 className={styles.logo}>Reforma</h1>
                    <p className={styles.tagline}>Legal Practice Management</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <h2 className={styles.title}>Welcome Back</h2>
                    <p className={styles.subtitle}>Sign in to your account</p>

                    {error && (
                        <div className={styles.error}>
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="you@lawfirm.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <div className={styles.formFooter}>
                        <Link href="/auth/forgot-password" className={styles.forgotLink}>
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isLoading}
                    >
                        {isLoading ? "Signing in..." : "Sign In"}
                    </button>

                    <p className={styles.registerPrompt}>
                        Don't have an account?{" "}
                        <Link href="/auth/register" className={styles.registerLink}>
                            Create one
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
