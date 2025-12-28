"use client";

import Link from 'next/link';
import { Scale } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LandingHeader() {
    return (
        <header className="w-full py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between absolute top-0 z-50">
            <div className="flex items-center gap-3">
                <Scale className="text-teal-700 dark:text-teal-400" size={32} />
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                    ReformaOS
                </span>
            </div>
            <div className="flex items-center gap-4">
                <ThemeToggle />
                <Link
                    href="/login"
                    className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    Sign In
                </Link>
                <Link
                    href="/dashboard"
                    className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors dark:bg-teal-500 dark:hover:bg-teal-600"
                >
                    Get Started
                </Link>
            </div>
        </header>
    );
}
