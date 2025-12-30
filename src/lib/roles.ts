/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * Defines organizational roles and permission checks for the workspace.
 * Roles are ordered by seniority (index 0 = lowest, highest index = highest seniority).
 */

/**
 * All available roles in the organization, ordered by seniority (ascending).
 * The index represents the seniority level.
 */
export const ROLES = [
    { value: 'Intern / Extern', label: 'Intern / Extern', description: 'Temporary or external staff' },
    { value: 'Associate', label: 'Associate', description: 'Junior lawyer' },
    { value: 'Senior Associate', label: 'Senior Associate', description: 'Experienced lawyer' },
    { value: 'Practice Manager', label: 'Practice Manager', description: 'Manages practice operations' },
    { value: 'Deputy Head of Chamber', label: 'Deputy Head of Chamber', description: 'Deputy leadership role' },
    { value: 'Head of Chamber', label: 'Head of Chamber', description: 'Chamber leadership' },
    { value: 'Partner', label: 'Partner', description: 'Firm partner' },
    { value: 'Managing Partner', label: 'Managing Partner', description: 'Managing partner of the firm' },
] as const;

/**
 * Role values as a tuple type for type safety
 */
export type RoleValue = typeof ROLES[number]['value'];

/**
 * Array of role values for validation
 */
export const ROLE_VALUES: string[] = ROLES.map(r => r.value);

/**
 * Get the seniority level of a role (higher = more senior)
 * Returns -1 if role is not found
 */
export function getRoleSeniority(role: string): number {
    const index = ROLES.findIndex(r => r.value.toLowerCase() === role.toLowerCase());
    return index;
}

/**
 * Check if an assigner can assign a specific role to another user.
 * Users can only assign roles at or below their own seniority level.
 * Workspace owners can assign any role.
 */
export function canAssignRole(assignerRole: string, targetRole: string, isOwner: boolean = false): boolean {
    // Owners can assign any role
    if (isOwner) return true;

    const assignerSeniority = getRoleSeniority(assignerRole);
    const targetSeniority = getRoleSeniority(targetRole);

    // Invalid roles
    if (assignerSeniority === -1 || targetSeniority === -1) return false;

    // Can only assign roles at or below own level
    return assignerSeniority >= targetSeniority;
}

/**
 * Check if a user with the given role can invite members.
 * Currently: Partners, Managing Partners, and Owners can invite.
 */
export function canInviteMembers(role: string | undefined, isOwner: boolean = false): boolean {
    if (isOwner) return true;
    if (!role) return false;

    const invitePermittedRoles = ['Partner', 'Managing Partner'];
    return invitePermittedRoles.some(r => r.toLowerCase() === role.toLowerCase());
}

/**
 * Get available roles that a user can assign based on their own role
 */
export function getAssignableRoles(userRole: string, isOwner: boolean = false): typeof ROLES[number][] {
    if (isOwner) return [...ROLES];

    const userSeniority = getRoleSeniority(userRole);
    if (userSeniority === -1) return [];

    // Return roles at or below user's seniority level
    return ROLES.slice(0, userSeniority + 1);
}

/**
 * Validate if a role value is valid
 */
export function isValidRole(role: string): boolean {
    return ROLE_VALUES.some(r => r.toLowerCase() === role.toLowerCase());
}
