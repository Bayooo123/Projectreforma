'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader } from 'lucide-react';
import { resetPassword } from '@/app/actions/reset-password';

export default function ForgotPasswordPage() {
    const [state, action, isPending] = useActionState(resetPassword, {});

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-900">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white">
                        Forgot Password?
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {state.success ? (
                    <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-900">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <Mail className="h-5 w-5 text-green-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                                    Check your email
                                </h3>
                                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                                    <p>{state.message}</p>
                                </div>
                                <div className="mt-4">
                                    <Link
                                        href="/login"
                                        className="text-sm font-medium text-green-800 dark:text-green-200 hover:text-green-900 underline"
                                    >
                                        Back to Login
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form action={action} className="mt-8 space-y-6">
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="email-address" className="sr-only">
                                    Email address
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 dark:border-slate-600 placeholder-gray-500 dark:placeholder-slate-400 text-black bg-white dark:bg-white focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                />
                            </div>
                        </div>

                        {state.error && (
                            <p className="text-red-500 text-sm text-center">{state.error}</p>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isPending ? (
                                    <Loader className="animate-spin h-5 w-5 text-white" />
                                ) : (
                                    "Send Reset Link"
                                )}
                            </button>
                        </div>

                        <div className="text-center">
                            <Link href="/login" className="font-medium text-primary hover:text-primary/80 flex items-center justify-center gap-2 text-sm">
                                <ArrowLeft size={16} /> Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
