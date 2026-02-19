"use client";

import AppLayout from "./AppLayout";
import BrandingWizardModal from "@/components/management/BrandingWizardModal";
import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface ShellWrapperProps {
    children: React.ReactNode;
    user: any;
    workspace: any;
}

// Purely additive overlay: handles the branding wizard modal.
// Does NOT make any structural layout decisions — those are resolved server-side in layout.tsx.
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

// ShellWrapper: renders the authenticated app shell.
// The public-route guard is handled at the server level (layout.tsx).
// This component is only mounted for authenticated, non-public routes.
export default function ShellWrapper({ children, user, workspace }: ShellWrapperProps) {
    return (
        <Suspense fallback={<AppLayout user={user} workspace={workspace}>{children}</AppLayout>}>
            <WizardTrigger user={user} workspace={workspace}>
                {children}
            </WizardTrigger>
        </Suspense>
    );
}
