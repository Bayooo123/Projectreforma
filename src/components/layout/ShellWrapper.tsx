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

export default function ShellWrapper({ children, user, workspace }: ShellWrapperProps) {
    const pathname = usePathname();

    // Admin routes own their entire shell — bypass app layout completely
    if (pathname.startsWith('/admin')) {
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
