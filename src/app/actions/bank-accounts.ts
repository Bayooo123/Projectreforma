'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function createBankAccount(data: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    currency?: string;
}) {
    const session = await auth();
    if (!session?.user?.workspaceId) return { success: false, error: 'Unauthorized' };

    try {
        const account = await prisma.bankAccount.create({
            data: {
                workspaceId: session.user.workspaceId,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                accountName: data.accountName,
                currency: data.currency || 'NGN',
            },
        });
        revalidatePath('/settings');
        return { success: true, account };
    } catch (error) {
        console.error('Failed to create bank account:', error);
        return { success: false, error: 'Failed to create account' };
    }
}

export async function getBankAccounts(workspaceId: string) {
    try {
        const accounts = await prisma.bankAccount.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
        });
        return { success: true, accounts };
    } catch (error) {
        console.error('Failed to fetch bank accounts:', error);
        return { success: false, error: 'Failed to fetch accounts' };
    }
}

export async function deleteBankAccount(id: string) {
    const session = await auth();
    if (!session?.user?.workspaceId) return { success: false, error: 'Unauthorized' };

    try {
        // Verify ownership
        const account = await prisma.bankAccount.findUnique({ where: { id } });
        if (!account || account.workspaceId !== session.user.workspaceId) {
            return { success: false, error: 'Unauthorized' };
        }

        await prisma.bankAccount.delete({ where: { id } });
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete account' };
    }
}
