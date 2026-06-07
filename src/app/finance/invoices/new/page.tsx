import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import CreateInvoiceClient from './CreateInvoiceClient';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const { getCurrentUserWithWorkspace } = await import('@/lib/workspace');
    const dataObj = await getCurrentUserWithWorkspace();
    const workspace = dataObj?.workspace;
    if (!workspace) redirect('/login');

    const [clients, briefs] = await Promise.all([
        prisma.client.findMany({
            where: { workspaceId: workspace.id },
            select: { id: true, name: true, email: true, company: true },
            orderBy: { name: 'asc' },
        }),
        prisma.brief.findMany({
            where: { workspaceId: workspace.id, status: 'active' },
            select: { id: true, name: true, briefNumber: true },
            orderBy: { updatedAt: 'desc' },
            take: 30,
        }),
    ]);

    return (
        <CreateInvoiceClient
            workspaceId={workspace.id}
            clients={clients as any}
            briefs={briefs as any}
        />
    );
}
