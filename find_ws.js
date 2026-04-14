const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const ws = await prisma.workspace.findFirst({ select: { id: true, name: true } });
        console.log('WS:', JSON.stringify(ws));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
