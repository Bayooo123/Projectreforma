"use client";

import AppLayout from "./AppLayout";
import BrandingWizardModal from "@/components/management/BrandingWizardModal";
import GeofenceCheck from "@/components/attendance/GeofenceCheck";
import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface ShellWrapperProps {
    children: React.ReactNode;
    user: any;
    workspace: any;
}

// WizardTrigger: renders the branding wizard modal if needed.
function WizardTrigger({ user, workspace, children }: { user: any, workspace: any, children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [shouldShowWizard, setShouldShowWizard] = useState(false);
    const fullWorkspace = workspace;

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
            {shouldShowWizard && fullWorkspace && !fullWorkspace.brandingCompleted && pathname !== '/landing' && (
                <BrandingWizardModal
                    workspaceId={fullWorkspace.id}
                    workspaceName={fullWorkspace.name}
                    onComplete={handleCloseWizard}
                />
            )}
            {fullWorkspace?.id && (
                <GeofenceCheck workspaceId={fullWorkspace.id} />
            )}
            <AppLayout user={user} workspace={fullWorkspace}>
                {children}
            </AppLayout>
        </>
    );
}

// ShellWrapper: renders the authenticated app shell.
export default function ShellWrapper({ children, user, workspace }: ShellWrapperProps) {
    // We use the initial (lightweight) workspace for immediate shell rendering
    // and let WizardTrigger hydrate the full details.
    return (
        <Suspense fallback={<AppLayout user={user} workspace={workspace}>{children}</AppLayout>}>
            <WizardTrigger user={user} workspace={workspace}>
                {children}
            </WizardTrigger>
        </Suspense>
    );
}
