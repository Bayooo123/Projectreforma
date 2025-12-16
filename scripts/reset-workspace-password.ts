import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const workspaceId = 'cmj8ef2zk000336gj8j606v5y'; // ASCOLP
    const newPassword = 'password123';

    console.log(`Resetting password for workspace ID: ${workspaceId} to '${newPassword}'`);

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedWorkspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                joinPassword: hashedPassword
            }
        });

        console.log(`Successfully updated password for Workspace: ${updatedWorkspace.name}`);
        console.log(`New Firm Code (unchanged): ${updatedWorkspace.firmCode}`);

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
