"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppLayout from "./AppLayout";
import BrandingWizardModal from "@/components/management/BrandingWizardModal";
import { useEffect, useState, Suspense } from "react";

interface ShellWrapperProps {
    children: React.ReactNode;
    user: any;
    workspace: any;
}

function WizardTrigger({ workspace, user, children }: { workspace: any, user: any, children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [shouldShowWizard, setShouldShowWizard] = useState(false);

    useEffect(() => {
        const isPilotParam = searchParams.get('pilot') === 'true';
        const hasStoredTrigger = localStorage.getItem('reforma_pilot_wizard') === 'true';

        if (isPilotParam) {
            localStorage.setItem('reforma_pilot_wizard', 'true');
            setShouldShowWizard(true);
        } else if (hasStoredTrigger) {
            setShouldShowWizard(true);
        }
    }, [searchParams]);

    const handleCloseWizard = () => {
        localStorage.removeItem('reforma_pilot_wizard');
        setShouldShowWizard(false);
    };

    return (
        <>
            {shouldShowWizard && !workspace?.brandingCompleted && pathname !== '/landing' && (
                <BrandingWizardModal
                    workspaceId={workspace?.id}
                    workspaceName={workspace?.name}
                    onComplete={handleCloseWizard}
                />
            )}
            <AppLayout user={user} workspace={workspace}>
                {children}
            </AppLayout>
        </>
    );
}

export default function ShellWrapper({ children, user, workspace }: ShellWrapperProps) {
    const pathname = usePathname();

    // Define routes that should NOT have the sidebar/header shell
    // primarily the root landing page and auth pages (though auth pages usually don't have user session)
    const isPublicRoute =
        pathname === '/' ||
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password' ||
        pathname === '/join' ||
        pathname.startsWith('/join/');

    if (isPublicRoute) {
        return <>{children}</>;
    }

    return (
        <Suspense fallback={<AppLayout user={user} workspace={workspace}>{children}</AppLayout>}>
            <WizardTrigger user={user} workspace={workspace}>
                {children}
            </WizardTrigger>
        </Suspense>
    );
}
