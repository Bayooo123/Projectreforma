'use client';

import { useActionState } from 'react';
import { register } from '@/app/lib/actions';
import { Loader2, Scale, Building2, UserPlus } from 'lucide-react';
import Link from 'next/link';

const ADMIN_ROLES = [
    'Practice Manager',
    'Head of Chambers',
    'Deputy Head of Chambers',
    'Managing Partner',
    'Managing Associate',
];

export default function RegisterPage() {
    const [errorMessage, dispatch, isPending] = useActionState(register, undefined);

    return (
        <div className="flex min-h-screen">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-12 flex-col justify-between relative overflow-hidden">
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
                            Set up your firm<br />in minutes
                        </h2>
                        <p className="text-lg text-blue-100">
                            Join forward-thinking law firms using Reforma to manage cases,
                            collaborate with teams, and deliver exceptional client service.
                        </p>

                        <div className="space-y-4 pt-8">
                            <div className="flex items-start gap-3">
                                <Building2 className="w-6 h-6 text-blue-400 mt-1" />
                                <div>
                                    <h3 className="text-white font-semibold">Multi-Workspace Support</h3>
                                    <p className="text-blue-200 text-sm">Manage multiple firms from one account</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <UserPlus className="w-6 h-6 text-blue-400 mt-1" />
                                <div>
                                    <h3 className="text-white font-semibold">Invite Your Team</h3>
                                    <p className="text-blue-200 text-sm">Add team members and assign roles easily</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-blue-200 text-sm relative z-10">
                    © 2024 Reforma. All rights reserved.
                </p>
            </div>

            {/* Right Side - Register Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your firm</h2>
                        <p className="text-gray-600">
                            Already have an account?{' '}
                            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <form action={dispatch} className="space-y-5">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Your Full Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
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
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="+234 800 000 0000"
                            />
                        </div>

                        <div>
                            <label htmlFor="firmName" className="block text-sm font-medium text-gray-700 mb-2">
                                Law Firm Name
                            </label>
                            <input
                                id="firmName"
                                name="firmName"
                                type="text"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="Doe & Associates"
                            />
                        </div>

                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                                Your Role
                            </label>
                            <select
                                id="role"
                                name="role"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                            >
                                <option value="">Select your role</option>
                                {ADMIN_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Only senior management can set up a firm workspace
                            </p>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="••••••••"
                            />
                            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
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
                                    Creating your firm...
                                </>
                            ) : (
                                'Create Firm Account'
                            )}
                        </button>

                        <p className="text-xs text-gray-500 text-center">
                            By creating an account, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
