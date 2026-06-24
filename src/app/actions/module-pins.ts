'use server';

import { prisma } from '@/lib/prisma';
import { hashPin, verifyPin } from '@/lib/rbac';
import { requireAuth } from '@/lib/auth-utils';
import { mailService } from '@/lib/services/mail/mail';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export type ProtectedModule = 'office' | 'it' | 'compliance';

const MODULE_PIN_FIELD: Record<ProtectedModule, 'officeManagerPin' | 'itManagementPin' | 'compliancePin'> = {
    office: 'officeManagerPin',
    it: 'itManagementPin',
    compliance: 'compliancePin',
};

const MODULE_LABELS: Record<ProtectedModule, string> = {
    office: 'Office Manager',
    it: 'IT Management',
    compliance: 'Compliance',
};

async function getPracticeManagerEmail(workspaceId: string): Promise<string | null> {
    const pm = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            status: 'active',
            role: { equals: 'Practice Manager', mode: 'insensitive' },
        },
        include: { user: { select: { email: true } } },
    });
    if (pm?.user?.email) return pm.user.email;

    // Fall back to workspace owner
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { owner: { select: { email: true } } },
    });
    return workspace?.owner?.email ?? null;
}

async function assertPracticeManager(workspaceId: string) {
    const user = await requireAuth();
    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId, user: { email: user.email! }, status: 'active' },
        select: { role: true },
    });
    const isPM = membership?.role?.toLowerCase() === 'practice manager';
    const isOwner = await prisma.workspace
        .findUnique({ where: { id: workspaceId }, select: { ownerId: true } })
        .then(w => w?.ownerId === user.id);
    if (!isPM && !isOwner && !(user as any).isPlatformAdmin) {
        throw new Error('Only the Practice Manager can manage module PINs');
    }
    return user;
}

export async function isModulePinSet(workspaceId: string, module: ProtectedModule): Promise<boolean> {
    const field = MODULE_PIN_FIELD[module];
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { [field]: true },
    });
    return !!((workspace as any)?.[field]);
}

export async function verifyModulePin(
    workspaceId: string,
    module: ProtectedModule,
    pin: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const field = MODULE_PIN_FIELD[module];
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { [field]: true },
        });

        if (!workspace) return { success: false, error: 'Workspace not found' };

        const storedHash = (workspace as any)[field] as string | null;
        if (!storedHash) return { success: true }; // No PIN set → open access

        return verifyPin(pin, storedHash)
            ? { success: true }
            : { success: false, error: 'Incorrect PIN' };
    } catch {
        return { success: false, error: 'Verification failed' };
    }
}

export async function setModulePin(
    workspaceId: string,
    module: ProtectedModule,
    pin: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertPracticeManager(workspaceId);

        if (!/^\d{4}$/.test(pin)) {
            return { success: false, error: 'PIN must be exactly 4 digits' };
        }

        const field = MODULE_PIN_FIELD[module];
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { [field]: hashPin(pin) },
        });

        revalidatePath('/settings');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to set PIN' };
    }
}

export async function clearModulePin(
    workspaceId: string,
    module: ProtectedModule
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertPracticeManager(workspaceId);
        const field = MODULE_PIN_FIELD[module];
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { [field]: null },
        });
        revalidatePath('/settings');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to clear PIN' };
    }
}

export async function requestModulePinReset(
    workspaceId: string,
    module: ProtectedModule
): Promise<{ success: boolean; error?: string }> {
    try {
        const pmEmail = await getPracticeManagerEmail(workspaceId);
        if (!pmEmail) return { success: false, error: 'No Practice Manager found for this workspace' };

        // Clean up any unused previous tokens for this module
        await prisma.modulePinReset.deleteMany({
            where: { workspaceId, module, used: false },
        });

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

        await prisma.modulePinReset.create({
            data: { workspaceId, module, token, expiresAt },
        });

        const resetUrl = `${process.env.NEXTAUTH_URL}/settings?pinReset=${token}&module=${module}`;
        const label = MODULE_LABELS[module];

        await mailService.send({
            to: pmEmail,
            subject: `Reset ${label} PIN — ReformaOS`,
            html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
                    <h2 style="margin:0 0 8px">PIN Reset Request</h2>
                    <p style="color:#555;margin:0 0 24px">
                        A PIN reset was requested for the <strong>${label}</strong> module in your ReformaOS workspace.
                    </p>
                    <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
                        Reset ${label} PIN
                    </a>
                    <p style="color:#999;font-size:13px;margin-top:24px">
                        This link expires in 2 hours. If you did not request this, you can ignore this email — the existing PIN remains active.
                    </p>
                </div>
            `,
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to send reset email' };
    }
}

export async function consumeModulePinReset(
    token: string,
    newPin: string
): Promise<{ success: boolean; module?: ProtectedModule; error?: string }> {
    try {
        const record = await prisma.modulePinReset.findUnique({ where: { token } });

        if (!record) return { success: false, error: 'Invalid or expired reset link' };
        if (record.used) return { success: false, error: 'This reset link has already been used' };
        if (record.expiresAt < new Date()) return { success: false, error: 'Reset link has expired' };

        if (!/^\d{4}$/.test(newPin)) {
            return { success: false, error: 'PIN must be exactly 4 digits' };
        }

        const module = record.module as ProtectedModule;
        const field = MODULE_PIN_FIELD[module];

        await prisma.$transaction([
            prisma.workspace.update({
                where: { id: record.workspaceId },
                data: { [field]: hashPin(newPin) },
            }),
            prisma.modulePinReset.update({
                where: { token },
                data: { used: true },
            }),
        ]);

        revalidatePath('/settings');
        return { success: true, module };
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to reset PIN' };
    }
}

export async function getModulePinStatuses(
    workspaceId: string
): Promise<{ office: boolean; it: boolean; compliance: boolean }> {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { officeManagerPin: true, itManagementPin: true, compliancePin: true },
    });
    return {
        office: !!workspace?.officeManagerPin,
        it: !!workspace?.itManagementPin,
        compliance: !!workspace?.compliancePin,
    };
}
