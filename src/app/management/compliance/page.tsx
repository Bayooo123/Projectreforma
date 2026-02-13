import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ComplianceDashboard from "@/components/compliance/ComplianceDashboard";
import { PinProtection } from "@/components/auth/PinProtection";

export const dynamic = 'force-dynamic';

export default async function ComplianceManagementPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        select: { workspaceId: true }
    });

    if (!member) {
        return <div className="p-10 text-center">No Workspace Found</div>;
    }

    return (
        <div className="p-8">
            <div className="max-w-[1400px] mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Compliance Monitoring</h1>
                    <p className="text-slate-500 dark:text-slate-400">Systematic tracking and enforcement of regulatory obligations</p>
                </div>

                {/* ... */}

                <div className="mt-8">
                    <PinProtection
                        workspaceId={member.workspaceId}
                        featureId="compliance"
                        title="Compliance Access Restricted"
                        description="Strict access control. Enter admin PIN."
                    >
                        <ComplianceDashboard workspaceId={member.workspaceId} />
                    </PinProtection>
                </div>
            </div>
        </div>
    );
}
