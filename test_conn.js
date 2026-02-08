
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const ws = await prisma.workspace.findFirst({
            where: { name: { contains: 'ASCOLP', mode: 'insensitive' } }
        });
        console.log('RESULT:' + JSON.stringify(ws));
    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
