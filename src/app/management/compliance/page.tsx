import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ComplianceDashboard from "@/components/compliance/ComplianceDashboard";
import { PinProtection } from "@/components/auth/PinProtection";
import { getComplianceTasks } from "@/app/actions/compliance";

export const dynamic = 'force-dynamic';

export default async function ComplianceManagementPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    // Centralized workspace resolution
    const { getCurrentUserWithWorkspace } = await import("@/lib/workspace");
    const data = await getCurrentUserWithWorkspace();
    const workspace = data?.workspace;

    if (!workspace) {
        return <div className="p-10 text-center text-secondary">No active workspace found.</div>;
    }

    // Pre-fetch Federal compliance tasks server-side
    const initialTier = 'Federal';
    const result = await getComplianceTasks(workspace.id, initialTier);
    const initialTasks = result.success ? result.data : [];

    return (
        <div className="p-8">
            <div className="max-w-[1400px] mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Compliance Monitoring</h1>
                    <p className="text-secondary dark:text-slate-400">Systematic tracking and enforcement of regulatory obligations</p>
                </div>

                <div className="mt-8">
                    <PinProtection
                        workspaceId={workspace.id}
                        featureId="compliance"
                        variant="compliance"
                    >
                        <ComplianceDashboard
                            workspaceId={workspace.id}
                            initialTasks={initialTasks}
                            initialTier={initialTier}
                        />
                    </PinProtection>
                </div>
            </div>
        </div>
    );
}
