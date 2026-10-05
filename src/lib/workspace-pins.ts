import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getRoleSeniority } from '@/lib/roles';

// Every workspace-level PIN column. They all share one storage format and one
// verification path — before this, each module hashed (or didn't) its own way.
export type WorkspacePinField =
    | 'adminCode'
    | 'revenuePin'
    | 'litigationPin'
    | 'officeManagerPin'
    | 'itManagementPin'
    | 'compliancePin';

const BCRYPT_ROUNDS = 10;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$/;

// A 4–5 digit PIN has at most 100k values, so the hash alone doesn't stop a
// determined guesser — the attempt limit does.
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

// Head of Chamber and above, plus the Practice Manager and the owner.
const PIN_MANAGER_MIN_SENIORITY = getRoleSeniority('Head of Chamber');

export function hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export function isBcryptHash(stored: string): boolean {
    return BCRYPT_PATTERN.test(stored);
}

/**
 * Verifies a PIN against whatever is stored: bcrypt (current), unsalted
 * SHA-256 (what adminCode and the module PINs used before), or plaintext
 * (what revenuePin/litigationPin used before). needsRehash means the caller
 * should overwrite the stored value with hashPin(input).
 */
export async function verifyStoredPin(input: string, stored: string | null): Promise<{ valid: boolean; needsRehash: boolean }> {
    if (!stored) return { valid: false, needsRehash: false };
    if (isBcryptHash(stored)) return { valid: await bcrypt.compare(input, stored), needsRehash: false };

    const valid = SHA256_PATTERN.test(stored)
        ? createHash('sha256').update(input).digest('hex') === stored
        : input === stored;
    return { valid, needsRehash: valid };
}

export type PinCheckResult = 'not_set' | 'valid' | 'invalid' | 'locked';

/**
 * Checks a PIN for one workspace field, rate-limited per user and field, and
 * upgrades a legacy-format stored value to bcrypt on a correct entry.
 */
export async function checkWorkspacePin(
    workspaceId: string,
    field: WorkspacePinField,
    pin: string,
    userId: string
): Promise<PinCheckResult> {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { [field]: true },
    });
    const stored = (workspace as Record<string, string | null> | null)?.[field] ?? null;
    if (!stored) return 'not_set';

    // Only wrong guesses count, so someone using the PIN all day isn't locked out.
    const key = `pin:${workspaceId}:${field}:${userId}`;
    const now = new Date();
    const failures = await prisma.rateLimit.findUnique({ where: { key } });
    const windowOpen = !!failures && failures.expiresAt > now;
    if (windowOpen && failures.count >= MAX_ATTEMPTS) return 'locked';

    const { valid, needsRehash } = await verifyStoredPin(pin, stored);
    if (!valid) {
        const expiresAt = new Date(now.getTime() + ATTEMPT_WINDOW_SECONDS * 1000);
        await prisma.rateLimit.upsert({
            where: { key },
            create: { key, count: 1, expiresAt },
            update: windowOpen ? { count: { increment: 1 } } : { count: 1, expiresAt },
        });
        return 'invalid';
    }
    if (failures) await prisma.rateLimit.delete({ where: { key } }).catch(() => {});

    if (needsRehash) {
        await prisma.workspace.update({ where: { id: workspaceId }, data: { [field]: await hashPin(pin) } });
    }
    return 'valid';
}

export const PIN_CHECK_ERRORS: Record<Exclude<PinCheckResult, 'valid'>, string> = {
    not_set: 'No PIN set',
    invalid: 'Incorrect PIN',
    locked: 'Too many attempts. Try again in 15 minutes.',
};

/** Who may set or clear a workspace PIN. */
export async function canManageWorkspacePins(workspaceId: string, userId: string): Promise<boolean> {
    const [workspace, membership] = await Promise.all([
        prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } }),
        prisma.workspaceMember.findFirst({ where: { workspaceId, userId, status: 'active' }, select: { role: true } }),
    ]);
    if (workspace?.ownerId === userId) return true;
    if (!membership) return false;
    return membership.role.toLowerCase() === 'practice manager' || getRoleSeniority(membership.role) >= PIN_MANAGER_MIN_SENIORITY;
}
