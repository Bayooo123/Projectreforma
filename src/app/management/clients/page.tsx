import { redirect } from 'next/navigation';
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClients } from "@/app/actions/clients";
import ClientsPageClient from "./ClientsPageClient";

export default async function ClientsPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    // Centralized workspace resolution
    const { getCurrentUserWithWorkspace } = await import("@/lib/workspace");
    const dataObj = await getCurrentUserWithWorkspace();
    const workspace = dataObj?.workspace;
    const user = dataObj?.user;

    if (!workspace) {
        return <div className="p-10 text-center text-slate-500">No active workspace found.</div>;
    }

    // Pre-fetch initial clients list (page 1)
    const result = await getClients(workspace.id, { page: 1, limit: 10 });
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
