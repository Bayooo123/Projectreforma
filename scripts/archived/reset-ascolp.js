const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetASCOLPPassword() {
    try {
        const workspace = await prisma.workspace.findFirst({
            where: {
                name: {
                    contains: 'ASCOLP',
                    mode: 'insensitive'
                }
            }
        });

        if (!workspace) {
            console.log('ERROR: ASCOLP workspace not found');
            return;
        }

        const newPassword = 'ASCOLP2026';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                joinPassword: hashedPassword,
                firmCode: workspace.firmCode || 'ASCOLP'
            }
        });

        console.log('========================================');
        console.log('SUCCESS! ASCOLP password has been reset');
        console.log('========================================');
        console.log('Workspace Name:', workspace.name);
        console.log('Firm Code:', workspace.firmCode || 'ASCOLP');
        console.log('New Join Password:', newPassword);
        console.log('========================================');
        console.log('');
        console.log('Share these credentials with new team members:');
        console.log('  Firm Code: ' + (workspace.firmCode || 'ASCOLP'));
        console.log('  Password: ' + newPassword);
        console.log('');
        console.log('They can join at: /join');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetASCOLPPassword();
