
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

        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: workspace.id },
            include: { user: true },
            orderBy: { role: 'asc' } // Basic ordering
        });

        console.log('\n--- ACCOUNTS IN ASCOLP WORKSPACE ---');
        console.log(`Total Members: ${members.length}\n`);

        console.table(members.map(m => ({
            Name: m.user.name,
            Email: m.user.email,
            Role: m.role,
            Designation: m.designation || 'N/A',
            Status: m.status
        })));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
