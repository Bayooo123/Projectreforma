import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function requireAuth() {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized: Please log in to perform this action');
    }
    return session.user;
}

export async function requireWorkspaceRole(workspaceId: string, allowedRoles: string[]) {
    const user = await requireAuth();

    // Find the user's membership in the specific workspace
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            user: { email: user.email },
        },
    });

    if (!membership) {
        throw new Error('Unauthorized: You are not a member of this workspace');
    }

    if (!allowedRoles.includes(membership.role)) {
        throw new Error(`Forbidden: This action requires one of the following roles: ${allowedRoles.join(', ')}`);
    }

    return membership;
}
