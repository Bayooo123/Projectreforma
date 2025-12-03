'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { Loader2, Scale, Shield, Users } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined);

    return (
        <div className="flex min-h-screen">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-12 flex-col justify-between relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-500 rounded-full filter blur-3xl"></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <Scale className="w-10 h-10 text-blue-400" />
                        <h1 className="text-3xl font-bold text-white">Reforma</h1>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-4xl font-bold text-white leading-tight">
                            Modern Legal Practice<br />Management
                        </h2>
                        <p className="text-lg text-blue-100">
                            Streamline your law firm operations with intelligent case management,
                            automated workflows, and powerful analytics.
                        </p>

                        <div className="space-y-4 pt-8">
                            <div className="flex items-start gap-3">
                                <Shield className="w-6 h-6 text-blue-400 mt-1" />
                                <div>
                                    <h3 className="text-white font-semibold">Secure & Compliant</h3>
                                    <p className="text-blue-200 text-sm">Bank-level encryption and data protection</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users className="w-6 h-6 text-blue-400 mt-1" />
                                <div>
                                    <h3 className="text-white font-semibold">Team Collaboration</h3>
                                    <p className="text-blue-200 text-sm">Work seamlessly with your entire firm</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-blue-200 text-sm relative z-10">
                    © 2024 Reforma. All rights reserved.
                </p>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
                        <p className="text-gray-600">
                            Don't have an account?{' '}
                            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                                Create your firm
                            </Link>
                        </p>
                    </div>

                    <form action={dispatch} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="you@lawfirm.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="••••••••"
                            />
                        </div>

                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={20} />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                            Forgot your password?
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
