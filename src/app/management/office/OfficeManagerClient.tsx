"use client";

import ManagementTabs from "@/components/management/ManagementTabs";
import FinancialLog from "@/components/management/FinancialLog";

interface OfficeManagerClientProps {
    workspaceId: string;
}

export default function OfficeManagerClient({ workspaceId }: OfficeManagerClientProps) {
    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Office Management</h1>
                <p className="text-slate-500 dark:text-slate-400">Financial oversight and workspace configuration</p>
            </div>

            <ManagementTabs />

            <div className="mt-8">
                <FinancialLog workspaceId={workspaceId} />
            </div>
        </div>
    );
}
