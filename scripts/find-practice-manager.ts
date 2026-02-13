
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Searching for ASCOLP workspace...');
        const workspace = await prisma.workspace.findFirst({
            where: {
                OR: [
                    { slug: { contains: 'ascolp', mode: 'insensitive' } },
                    { firmCode: 'ASCOLP' },
                    { name: { contains: 'Abiola Sanni', mode: 'insensitive' } }
                ]
            }
        });

        if (!workspace) {
            console.log('ASCOLP workspace not found.');
            return;
        }

        console.log(`Found workspace: ${workspace.name} (${workspace.id})`);

        console.log('Searching for Practice Manager...');
        const pm = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: workspace.id,
                role: 'Practice Manager' // Matching UserRole.PRACTICE_MANAGER
            },
            include: {
                user: true
            }
        });

        if (pm) {
            console.log(`Found Practice Manager:`);
            console.log(`Name: ${pm.user.name}`);
            console.log(`Email: ${pm.user.email}`);
            console.log(`Status: ${pm.status}`);
        } else {
            console.log('No Practice Manager found in this workspace.');

            // List all members and their roles to help debug
            const members = await prisma.workspaceMember.findMany({
                where: { workspaceId: workspace.id },
                include: { user: true }
            });
            console.log('\nAll Workspace Members:');
            members.forEach(m => {
                console.log(`- ${m.user.name} (${m.user.email}): ${m.role}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
