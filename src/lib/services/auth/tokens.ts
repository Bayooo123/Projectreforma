
import { prisma } from '@/lib/prisma';
import { randomBytes, createHash } from 'crypto';

/**
 * Utility for hashing sensitive tokens before storing them in the database.
 * SHA-256 is used as it's cryptographically secure and standard for this purpose.
 */
export const hashToken = (token: string): string => {
    return createHash('sha256').update(token).digest('hex');
};

/**
 * Generates an opaque, high-entropy random token.
 */
export const generateOpaqueToken = (): string => {
    return randomBytes(32).toString('hex');
};

/**
 * EMAIL VERIFICATION TOKENS
 */
export const createEmailVerificationToken = async (userId: string, email: string) => {
    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 Minutes

    // Invalidate any existing verification tokens for this user
    await (prisma as any).emailVerification.deleteMany({
        where: { userId }
    });

    await (prisma as any).emailVerification.create({
        data: {
            userId,
            email,
            tokenHash,
            expiresAt,
        }
    });

    return token;
};

export const validateEmailVerificationToken = async (token: string) => {
    const tokenHash = hashToken(token);

    const verification = await (prisma as any).emailVerification.findUnique({
        where: { tokenHash },
        include: { user: true }
    });

    if (!verification || verification.expiresAt < new Date() || verification.usedAt) {
        return null;
    }

    // Mark as used (single-use)
    await (prisma as any).emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() }
    });

    return verification;
};

/**
 * PASSWORD RESET TOKENS
 */
export const createPasswordResetToken = async (userId: string) => {
    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes

    // Invalidate any existing reset tokens for this user
    await (prisma as any).passwordResetRequest.deleteMany({
        where: { userId }
    });

    await (prisma as any).passwordResetRequest.create({
        data: {
            userId,
            tokenHash,
            expiresAt,
        }
    });

    return token;
};

export const validatePasswordResetToken = async (token: string) => {
    const tokenHash = hashToken(token);

    const resetRequest = await (prisma as any).passwordResetRequest.findUnique({
        where: { tokenHash },
        include: { user: true }
    });

    if (!resetRequest || resetRequest.expiresAt < new Date() || resetRequest.usedAt) {
        return null;
    }

    // Mark as used (single-use)
    await (prisma as any).passwordResetRequest.update({
        where: { id: resetRequest.id },
        data: { usedAt: new Date() }
    });

    return resetRequest;
};

/**
 * WORKSPACE INVITATION TOKENS
 */
export const createInvitationToken = async (workspaceId: string, email: string, role: string, invitedBy: string) => {
    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 Hours (3 Days)

    const invitation = await (prisma.invitation as any).create({
        data: {
            workspaceId,
            email,
            role,
            tokenHash,
            invitedBy,
            expiresAt,
        }
    });

    return { token, invitation };
};

export const validateInvitationToken = async (token: string) => {
    const tokenHash = hashToken(token);

    const invitation = await (prisma.invitation as any).findUnique({
        where: { tokenHash },
        include: { workspace: true }
    });

    if (!invitation || invitation.expiresAt < new Date() || invitation.status !== 'pending') {
        return null;
    }

    return invitation;
};
