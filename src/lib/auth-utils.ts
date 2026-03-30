import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getPermissionsForRole, Permission } from '@/lib/rbac';

export async function requireAuth() {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error('Unauthorized: Please log in to perform this action');
    }
    return session.user;
}

export async function requireWorkspaceRole(workspaceId: string, allowedRoles: string[]) {
    // Deprecated: use requirePermission instead. Keeping for backwards compatibility during migration.
    const user = await requireAuth();

    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, user: { email: user.email! } },
    });

    if (!membership) throw new Error('Unauthorized: You are not a member of this workspace');

    if (!allowedRoles.includes(membership.role)) {
        throw new Error(`Forbidden: This action requires one of the following roles: ${allowedRoles.join(', ')}`);
    }

    return membership;
}

/**
 * Modern RBAC Guard: Checks if a user has a specific granular permission.
 * Bypasses the check entirely if the user is the Workspace Owner.
 */
export async function requirePermission(workspaceId: string, requiredPermission: Permission) {
    const user = await requireAuth();

    const [membership, workspace] = await Promise.all([
        prisma.workspaceMember.findFirst({
            where: { workspaceId, user: { email: user.email! } },
        }),
        prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { ownerId: true }
        })
    ]);

    if (!membership) {
        throw new Error('Unauthorized: You are not a member of this workspace');
    }

    const isWorkspaceOwner = workspace?.ownerId === user.id;
    const permissions = getPermissionsForRole(membership.role);

    if (!isWorkspaceOwner && !permissions.includes(requiredPermission)) {
        throw new Error(`Forbidden: This action requires the ${requiredPermission} permission.`);
    }

    return { ...membership, isWorkspaceOwner, permissions };
}

export async function requirePlatformAdmin() {
    const user = await requireAuth();

    // Fetch user from DB to verify platform admin status
    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { isPlatformAdmin: true }
    });

    if (!dbUser || !dbUser.isPlatformAdmin) {
        throw new Error('Forbidden: This action requires Platform Admin privileges');
    }

    return user;
}
