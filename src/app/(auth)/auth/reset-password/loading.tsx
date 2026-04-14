import { Loader2 } from 'lucide-react';

export default function ResetPasswordLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
            <div className="max-w-md w-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-sm text-tertiary">Loading reset page...</p>
            </div>
        </div>
    );
}
