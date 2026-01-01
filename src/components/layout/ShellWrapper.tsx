"use client";

import { usePathname } from "next/navigation";
import AppLayout from "./AppLayout";

interface ShellWrapperProps {
    children: React.ReactNode;
    user: any;
    workspace: any;
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
        <AppLayout user={user} workspace={workspace}>
            {children}
        </AppLayout>
    );
}
