"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import styles from "../login/page.module.css";

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        firmName: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    firmName: formData.firmName,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Registration failed");
                setIsLoading(false);
                return;
            }

            // Auto-login after successful registration
            const signInResult = await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (signInResult?.error) {
                setError("Registration successful, but login failed. Please try logging in.");
                setIsLoading(false);
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch (err) {
            setError("An error occurred. Please try again.");
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
                    <h2 className={styles.title}>Create Your Account</h2>
                    <p className={styles.subtitle}>Start managing your law firm today</p>

                    {error && (
                        <div className={styles.error}>
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>
                            Full Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="you@lawfirm.com"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="firmName" className={styles.label}>
                            Law Firm Name
                        </label>
                        <input
                            id="firmName"
                            name="firmName"
                            type="text"
                            value={formData.firmName}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Doe & Associates"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="••••••••"
                            required
                            minLength={8}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Minimum 8 characters
                        </span>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isLoading}
                    >
                        {isLoading ? "Creating account..." : "Create Account"}
                    </button>

                    <p className={styles.registerPrompt}>
                        Already have an account?{" "}
                        <Link href="/auth/login" className={styles.registerLink}>
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
