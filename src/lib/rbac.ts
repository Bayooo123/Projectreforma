
import { createHash } from 'crypto';

// Default PIN is '0987'
// SHA-256 hash of '0987'
export const DEFAULT_ADMIN_PIN_HASH = '1ea2f89d934cb4a2af0b486736609cf9cb4bdafdc6e946e79aecb02b9d9dceb4';

export enum UserRole {
    MANAGING_PARTNER = 'Managing Partner',
    HEAD_OF_CHAMBERS = 'Head of Chambers',
    PRACTICE_MANAGER = 'Practice Manager',
    ASSOCIATE = 'Associate',
    LEGAL_STAFF = 'Legal Staff', // General fallback
}

export type Permission = 
    | 'DELETE_BRIEF'
    | 'EDIT_BRIEF'
    | 'MANAGE_USERS'
    | 'MANAGE_OFFICE'
    | 'DELETE_MATTER'
    | 'VIEW_FINANCIALS'
    | 'DELETE_CLIENT';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    'owner': ['DELETE_BRIEF', 'EDIT_BRIEF', 'MANAGE_USERS', 'MANAGE_OFFICE', 'DELETE_MATTER', 'VIEW_FINANCIALS', 'DELETE_CLIENT'],
    'partner': ['DELETE_BRIEF', 'EDIT_BRIEF', 'MANAGE_USERS', 'MANAGE_OFFICE', 'DELETE_MATTER', 'VIEW_FINANCIALS', 'DELETE_CLIENT'],
    'admin': ['MANAGE_USERS', 'MANAGE_OFFICE'],
    'associate': ['EDIT_BRIEF'],
    'member': [],
};

// Map formal display roles to system roles to calculate permissions
const getSystemRole = (role: string): string => {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('owner')) return 'owner';
    if (lowerRole.includes('managing partner')) return 'owner';
    if (lowerRole.includes('head of chambers')) return 'partner';
    if (lowerRole.includes('partner')) return 'partner';
    if (lowerRole.includes('manager')) return 'admin';
    if (lowerRole.includes('admin')) return 'admin';
    if (lowerRole.includes('associate')) return 'associate';
    return 'member';
};

export function getPermissionsForRole(role: string): Permission[] {
    const systemRole = getSystemRole(role);
    return ROLE_PERMISSIONS[systemRole] || [];
}

export const PERMISSIONS_LEGACY = {
    DELETE_BRIEF: [UserRole.MANAGING_PARTNER, UserRole.HEAD_OF_CHAMBERS],
    MANAGE_OFFICE: [UserRole.PRACTICE_MANAGER],
};

/**
 * Hashes a PIN using SHA-256
 */
export function hashPin(pin: string): string {
    return createHash('sha256').update(pin).digest('hex');
}

/**
 * Verifies if a PIN matches the stored hash
 */
export function verifyPin(inputPin: string, storedHash: string | null): boolean {
    if (!storedHash) return false;
    const inputHash = hashPin(inputPin);
    return inputHash === storedHash;
}

/**
 * Checks if a user has the required role for an action
 */
export function hasRolePermission(userRole: string, allowedRoles: string[]): boolean {
    // Normalize role string comparison
    return allowedRoles.some(r => r.toLowerCase() === userRole.toLowerCase());
}

export const BriefPermissions = {
    canDelete: (role: string) => hasRolePermission(role, PERMISSIONS_LEGACY.DELETE_BRIEF),
    canEditLawyerInCharge: (role: string) => hasRolePermission(role, [UserRole.MANAGING_PARTNER, UserRole.HEAD_OF_CHAMBERS, UserRole.PRACTICE_MANAGER]),
    canEditBriefNumber: (role: string) => hasRolePermission(role, [UserRole.MANAGING_PARTNER, UserRole.HEAD_OF_CHAMBERS, UserRole.PRACTICE_MANAGER]),
    canReassignHierarchy: (role: string) => hasRolePermission(role, [UserRole.MANAGING_PARTNER, UserRole.HEAD_OF_CHAMBERS]),
};

export function canEditLawyerInCharge(role: string) {
    return BriefPermissions.canEditLawyerInCharge(role);
}
