
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countAll() {
    try {
        const tableNames = [
            'Workspace', 'User', 'Matter', 'CourtDate', 'Brief', 'Task', 'Client', 'Invoice', 'Payment'
        ];

        for (const name of tableNames) {
            const count = await prisma[name.toLowerCase()].count();
            console.log(`${name}: ${count}`);
        }

        const latestBriefs = await prisma.brief.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, createdAt: true }
        });
        console.log('LATEST_BRIEFS:' + JSON.stringify(latestBriefs));

    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

countAll();
