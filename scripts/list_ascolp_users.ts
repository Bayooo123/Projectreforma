
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing ASCOLP Workspace Users...');

    try {
        const workspace = await prisma.workspace.findFirst({
            where: {
                OR: [
                    { name: { contains: 'ASCOLP', mode: 'insensitive' } },
                    { slug: { contains: 'ascolp', mode: 'insensitive' } }
                ]
            },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });

        if (!workspace) {
            console.error('❌ ASCOLP workspace not found!');
            return;
        }

        console.log(`Workspace: ${workspace.name} (${workspace.id})`);
        console.log(`Total Members: ${workspace.members.length}`);
        console.log('--------------------------------------------------');
        console.log('| Name                 | Email                          | Role     | Status   |');
        console.log('--------------------------------------------------');

        workspace.members.forEach(member => {
            console.log(`| ${member.user.name?.padEnd(20) || 'N/A'.padEnd(20)} | ${member.user.email.padEnd(30)} | ${member.role.padEnd(8)} | ${member.status.padEnd(8)} |`);
        });
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('Error listing users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
