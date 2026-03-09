
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
    try {
        const email = 'bayo@abiolasanniandco.com';
        const newPassword = 'password123';
        const hashedPassword = await hash(newPassword, 12);

        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
            include: { workspaces: true }
        });

        const workspaceId = user.workspaces[0]?.workspaceId;
        console.log(`Found user: ${user.email} (Workspace: ${workspaceId})`);

        if (!workspaceId) {
            console.log('User has no workspace!');
            return;
        }

        // Also get Firm Code for login
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (workspace) {
            console.log(`Firm Code: ${workspace.firmCode}`);
            console.log(`Firm Password (if needed): ${workspace.joinPassword}`);
        }

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
