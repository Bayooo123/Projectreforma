
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting ASCOLP password reset...');

    try {
        const workspace = await prisma.workspace.findFirst({
            where: {
                OR: [
                    { name: { contains: 'ASCOLP', mode: 'insensitive' } },
                    { slug: { contains: 'ascolp', mode: 'insensitive' } }
                ]
            }
        });

        if (!workspace) {
            console.error('❌ ASCOLP workspace not found!');
            return;
        }

        console.log(`Found workspace: ${workspace.name} (ID: ${workspace.id})`);

        const newPassword = 'Ascolp#2026';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedWorkspace = await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                joinPassword: hashedPassword
            }
        });

        console.log(`✅ Successfully updated join password for ${updatedWorkspace.name}`);
        console.log(`New Password: ${newPassword}`);

    } catch (error) {
        console.error('Error updating password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
