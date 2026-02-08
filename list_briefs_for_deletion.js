
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listBriefs() {
    try {
        const briefs = await prisma.brief.findMany({
            select: { id: true, name: true, briefNumber: true }
        });
        console.log('BRIEFS:' + JSON.stringify(briefs));
    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

listBriefs();
