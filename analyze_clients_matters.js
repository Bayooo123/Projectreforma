
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeData() {
    try {
        const clients = await prisma.client.findMany({
            select: { id: true, name: true, workspaceId: true }
        });
        console.log('CLIENTS:' + JSON.stringify(clients));

        const matters = await prisma.matter.findMany({
            where: { status: 'active' },
            select: { id: true, name: true, status: true, workspaceId: true }
        });
        console.log('ACTIVE_MATTERS:' + JSON.stringify(matters));

        const workspaces = await prisma.workspace.findMany({
            select: { id: true, name: true }
        });
        console.log('WORKSPACES:' + JSON.stringify(workspaces));

    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

analyzeData();
