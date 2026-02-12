/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * Defines role hierarchy and permission checks for the Reforma platform.
 */

/**
 * Senior roles that have elevated permissions
 */
export const SENIOR_ROLES = [
    'principal_partner',
    'partner',
    'head_of_chambers',
    'owner' // Workspace owner always has senior permissions
] as const;

export type SeniorRole = typeof SENIOR_ROLES[number];

/**
 * Check if a user role has permission to edit the Lawyer in Charge field
 * 
 * @param userRole - The role of the user in the workspace
 * @returns true if the user can edit Lawyer in Charge, false otherwise
 */
export function canEditLawyerInCharge(userRole: string): boolean {
    return SENIOR_ROLES.includes(userRole as SeniorRole);
}

/**
 * Check if a user is a workspace owner
 * 
 * @param userRole - The role of the user in the workspace
 * @returns true if the user is the workspace owner
 */
export function isWorkspaceOwner(userRole: string): boolean {
    return userRole === 'owner';
}

/**
 * Get display-friendly role name
 * 
 * @param role - The role identifier
 * @returns Human-readable role name
 */
export function getRoleDisplayName(role: string): string {
    const roleMap: Record<string, string> = {
        'principal_partner': 'Principal Partner',
        'partner': 'Partner',
        'head_of_chambers': 'Head of Chambers',
        'senior_associate': 'Senior Associate',
        'associate': 'Associate',
        'junior_associate': 'Junior Associate',
        'paralegal': 'Paralegal',
        'admin': 'Administrator',
        'owner': 'Owner'
    };

    return roleMap[role] || role;
}

/**
 * Brief-related permission checks
 */
export const BriefPermissions = {
    /**
     * Can the user edit basic brief details (title, description, etc.)
     */
    canEditBriefDetails: (userRole: string, isCreator: boolean): boolean => {
        return isCreator || canEditLawyerInCharge(userRole);
    },

    /**
     * Can the user edit the brief number
     */
    canEditBriefNumber: (userRole: string): boolean => {
        return canEditLawyerInCharge(userRole);
    },

    /**
     * Can the user delete a brief
     */
    canDeleteBrief: (userRole: string): boolean => {
        return canEditLawyerInCharge(userRole);
    },

    /**
     * Can the user view audit logs
     */
    canViewAuditLogs: (userRole: string): boolean => {
        return canEditLawyerInCharge(userRole);
    }
};
