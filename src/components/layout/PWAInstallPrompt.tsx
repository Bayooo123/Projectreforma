"use client";

import { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import Image from 'next/image';

function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true
    );
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        if (isStandalone()) return;
        if (localStorage.getItem('pwa_prompt_dismissed')) return;

        if (isIOSDevice()) {
            setIos(true);
            setShowPrompt(true);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Push notification subscription — only request once the app is running in standalone mode
    // (i.e. after it's been installed), so it doesn't clash with the install prompt UI
    useEffect(() => {
        if (!isStandalone()) return;
        if ('serviceWorker' in navigator && 'PushManager' in window && !localStorage.getItem('push_requested')) {
            const requestPush = async () => {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                    });
                    await fetch('/api/notifications/push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'subscribe', subscription }),
                    });
                }
                localStorage.setItem('push_requested', 'true');
            };
            setTimeout(requestPush, 5000);
        }
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setShowPrompt(false);
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!showPrompt) return null;

    if (ios) {
        return (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Install Reforma</h4>
                    <button
                        onClick={handleDismiss}
                        className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X size={16} />
                    </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Add Reforma to your home screen for the best experience.
                </p>
                <ol className="space-y-2 pl-0 list-none mb-0">
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                        Tap the <Share2 size={14} className="inline mx-1 text-blue-500" /> Share button in Safari
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                        Select <strong className="mx-1">&ldquo;Add to Home Screen&rdquo;</strong>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                        Tap <strong className="ml-1">Add</strong> to confirm
                    </li>
                </ol>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col gap-3">
            <div className="flex items-start gap-3">
                <Image
                    src="/logos/reforma-logo-monogram.png"
                    alt="Reforma"
                    width={44}
                    height={44}
                    className="rounded-xl flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Install Reforma</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Install as an app for offline support and faster access.
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss install prompt"
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <X size={16} />
                </button>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleInstall}
                    className="flex-1 bg-brand text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-opacity-90"
                >
                    <Download size={16} />
                    Install App
                </button>
                <button
                    onClick={handleDismiss}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    Not now
                </button>
            </div>
        </div>
    );
}
