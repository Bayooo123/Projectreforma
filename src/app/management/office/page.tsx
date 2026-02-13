import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OfficeManagerClient from "./OfficeManagerClient";
import { PinProtection } from "@/components/auth/PinProtection";

export const dynamic = 'force-dynamic';

export default async function OfficeManagementPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        select: { workspaceId: true }
    });

    if (!member) {
        return <div className="p-10 text-center">No Workspace Found</div>;
    }

    // ...

    return (
        <div className="p-8">
            <PinProtection
                workspaceId={member.workspaceId}
                featureId="office_manager"
                title="Office Management"
                description="Restricted to Practice Manager or Admin."
            >
                <OfficeManagerClient workspaceId={member.workspaceId} />
            </PinProtection>
        </div>
    );
}
