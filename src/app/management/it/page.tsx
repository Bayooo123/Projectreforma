import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ITManagementClient from './ITManagementClient';
import { PinProtection } from '@/components/auth/PinProtection';

export const dynamic = 'force-dynamic';

export default async function ITManagementPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id, status: 'active' },
        select: { workspaceId: true, role: true },
    });

    const workspace = member ? await prisma.workspace.findUnique({
        where: { id: member.workspaceId },
        select: { ownerId: true },
    }) : null;

    const isAdmin = !!(member && (
        ['admin', 'owner'].includes(member.role) || workspace?.ownerId === session.user.id
    ));

    if (!member) redirect('/briefs');

    return (
        <div className="p-8">
            <PinProtection
                workspaceId={member.workspaceId}
                featureId="it"
                module="it"
                variant="it"
            >
                <ITManagementClient workspaceId={member.workspaceId} isAdmin={isAdmin} />
            </PinProtection>
        </div>
    );
}
