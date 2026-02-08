
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOwner() {
    try {
        const ws = await prisma.workspace.findFirst({
            where: { name: 'ASCOLP' },
            include: { owner: true }
        });
        console.log('WS_OWNER:' + JSON.stringify(ws?.owner));
    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkOwner();
