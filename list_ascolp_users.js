const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    console.log('--- Finding ASCOLP Workspace ---');
    const workspace = await prisma.workspace.findFirst({
        where: {
            OR: [
                { name: { contains: 'ASCOLP', mode: 'insensitive' } },
                { firmCode: { contains: 'ASCOLP', mode: 'insensitive' } }
            ]
        }
    });

    if (!workspace) {
        console.log('ASCOLP workspace not found.');
        return;
    }

    console.log(`Workspace: ${workspace.name} (${workspace.firmCode})`);

    console.log('\n--- Retrieving Members ---');
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        include: { user: true },
        orderBy: { role: 'asc' } // Rough sort by role
    });

    console.log('Total Members:', members.length);
    console.log('-'.repeat(60));
    console.log(JSON.stringify(members.map(m => ({
        Name: m.user.name,
        Email: m.user.email,
        Role: m.role,
        "Status": m.status
    })), null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
