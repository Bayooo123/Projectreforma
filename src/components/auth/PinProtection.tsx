'use client';

import { useState, useEffect } from 'react';
import { verifyWorkspacePin } from '@/app/actions/rbac';
import { Lock, Unlock } from 'lucide-react';

interface PinProtectionProps {
    workspaceId: string;
    children: React.ReactNode;
    title?: string;
    description?: string;
    featureId: string; // Unique ID for session storage key
}

export function PinProtection({
    workspaceId,
    children,
    title = "Restricted Access",
    description = "Please enter the admin PIN to access this feature.",
    featureId
}: PinProtectionProps) {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check session storage on mount
        const storedAuth = sessionStorage.getItem(`rbac_auth_${workspaceId}_${featureId}`);
        if (storedAuth === 'true') {
            setIsUnlocked(true);
        }
        setIsLoading(false);
    }, [workspaceId, featureId]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const result = await verifyWorkspacePin(workspaceId, pin);

        if (result.success) {
            setIsUnlocked(true);
            sessionStorage.setItem(`rbac_auth_${workspaceId}_${featureId}`, 'true');
        } else {
            setError(result.error || 'Invalid PIN');
            setPin('');
        }
    };

    if (isLoading) return null;

    if (isUnlocked) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200 shadow-sm min-h-[300px]">
            <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
                <Lock className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 mb-6 text-center max-w-md">{description}</p>

            <form onSubmit={handleVerify} className="w-full max-w-xs flex flex-col gap-3">
                <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-center tracking-widest text-lg"
                    maxLength={10}
                    autoFocus
                />
                {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

                <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                >
                    <Unlock className="w-4 h-4" />
                    Unlock Access
                </button>
            </form>
        </div>
    );
}
