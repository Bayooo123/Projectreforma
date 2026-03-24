import FinancialLog from "@/components/management/FinancialLog";
import { prisma } from "@/lib/prisma";

interface OfficeManagerClientProps {
    workspaceId: string;
    initialExpenses: any[];
    initialSummaries: any[];
    userRole: string;
    isOwner: boolean;
}

export default function OfficeManagerClient({
    workspaceId,
    initialExpenses,
    initialSummaries,
    userRole,
    isOwner
}: OfficeManagerClientProps) {
    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary mb-2">Office Management</h1>
                <p className="text-secondary dark:text-slate-400">Financial oversight and workspace configuration</p>
            </div>

            <div className="mt-8">
                <FinancialLog
                    workspaceId={workspaceId}
                    initialExpenses={initialExpenses}
                    initialSummaries={initialSummaries}
                    userRole={userRole}
                    isOwner={isOwner}
                />
            </div>
        </div>
    );
}

