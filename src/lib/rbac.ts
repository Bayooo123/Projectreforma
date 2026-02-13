
import { createHash } from 'crypto';

// Default PIN is '0987'
// SHA-256 hash of '0987'
export const DEFAULT_ADMIN_PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

export enum UserRole {
    MANAGING_PARTNER = 'Managing Partner',
    HEAD_OF_CHAMBERS = 'Head of Chambers',
    PRACTICE_MANAGER = 'Practice Manager',
    ASSOCIATE = 'Associate',
    LEGAL_STAFF = 'Legal Staff', // General fallback
}

export const PERMISSIONS = {
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
    canDelete: (role: string) => hasRolePermission(role, PERMISSIONS.DELETE_BRIEF),
    canEditLawyerInCharge: (role: string) => hasRolePermission(role, [UserRole.MANAGING_PARTNER, UserRole.HEAD_OF_CHAMBERS, UserRole.PRACTICE_MANAGER]),
    canEditBriefNumber: (role: string) => hasRolePermission(role, [UserRole.MANAGING_PARTNER, UserRole.HEAD_OF_CHAMBERS, UserRole.PRACTICE_MANAGER]),
};

export function canEditLawyerInCharge(role: string) {
    return BriefPermissions.canEditLawyerInCharge(role);
}
