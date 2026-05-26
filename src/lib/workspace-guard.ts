'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Verifies the session user is an active member of the given workspace.
 * Throws 403 if not. Call this at every API boundary where workspaceId
 * is supplied by the client rather than derived from the session.
 */
export async function assertWorkspaceMember(workspaceId: string): Promise<string> {
    const session = await auth();
    if (!session?.user?.id) throw new Error('UNAUTHORIZED');

    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: session.user.id },
        select: { id: true },
    });

    if (!membership) throw new Error('FORBIDDEN');

    return session.user.id;
}
