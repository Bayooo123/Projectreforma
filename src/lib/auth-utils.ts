import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    return session?.user;
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    return user;
}

export function hasPermission(userRole: string, permission: string): boolean {
    const permissions: Record<string, string[]> = {
        owner: ["*"], // All permissions
        partner: [
            "view_all_matters",
            "view_analytics",
            "manage_matters",
            "view_expenses",
            "add_expenses",
            "view_clients",
            "manage_clients",
        ],
        lawyer: [
            "view_own_matters",
            "create_matters",
            "add_expenses",
            "view_clients",
        ],
        staff: ["view_own_matters", "add_expenses"],
    };

    const userPermissions = permissions[userRole.toLowerCase()] || [];
    return userPermissions.includes("*") || userPermissions.includes(permission);
}

export function canAccessWorkspace(
    userWorkspaceId: string,
    resourceWorkspaceId: string
): boolean {
    return userWorkspaceId === resourceWorkspaceId;
}
