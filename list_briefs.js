const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    console.log('Listing ASCOLP briefs...');
    const workspaces = await prisma.workspace.findMany();
    const workspace = workspaces.find(w => w.name.toUpperCase().includes('ASCOLP'));

    if (!workspace) {
        console.log('No workspace');
        return;
    }

    const briefs = await prisma.brief.findMany({
        where: { workspaceId: workspace.id }
    });

    console.log('--- Briefs List ---');
    console.log(briefs.map(b => `${b.id}: ${b.title}`).join('\n'));
    console.log('-------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
