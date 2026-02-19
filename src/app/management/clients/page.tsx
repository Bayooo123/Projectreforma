import { redirect } from 'next/navigation';
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClients } from "@/app/actions/clients";
import ClientsPageClient from "./ClientsPageClient";

export default async function ClientsPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        include: { workspace: true }
    });

    if (!member) {
        return <div className="p-10 text-center text-slate-500">No Workspace Associated with Account</div>;
    }

    // Pre-fetch initial clients list (page 1)
    const result = await getClients(member.workspaceId, { page: 1, limit: 10 });
    const initialClients = result.success ? result.data || [] : [];
    const totalPages = result.meta?.totalPages || 1;

    return (
        <div className="p-8">
            <ClientsPageClient
                workspaceId={member.workspaceId}
                userId={session.user.id}
                letterheadUrl={member.workspace.letterheadUrl}
                initialClients={initialClients as any}
                initialPages={totalPages}
            />
        </div>
    );
}
