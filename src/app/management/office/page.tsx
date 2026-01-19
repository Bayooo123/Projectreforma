import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OfficeManagerClient from "./OfficeManagerClient";

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

    return (
        <div className="p-8">
            <OfficeManagerClient workspaceId={member.workspaceId} />
        </div>
    );
}
