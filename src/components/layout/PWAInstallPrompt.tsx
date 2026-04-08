"use client";

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Optionally, check if user has previously dismissed
            const dismissed = localStorage.getItem('pwa_prompt_dismissed');
            if (!dismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Web Push Notification subscription logic
        if ('serviceWorker' in navigator && 'PushManager' in window && !localStorage.getItem('push_requested')) {
            const requestNotificationPermission = async () => {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                    });

                    // Send subscription to our backend
                    await fetch('/api/notifications/push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'subscribe', subscription })
                    });
                }
                localStorage.setItem('push_requested', 'true');
            };

            // Run after a slight delay to not interrupt initial load
            setTimeout(requestNotificationPermission, 5000);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Install Reforma</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Install Reforma as an app on your device for offline support and faster access.
                    </p>
                </div>
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
