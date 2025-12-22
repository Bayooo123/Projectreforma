const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.brief.count();
        console.log(`Total Briefs: ${count}`);

        const briefs = await prisma.brief.findMany({
            take: 5,
            select: { id: true, name: true, briefNumber: true, workspaceId: true }
        });
        console.log('Sample Briefs:', briefs);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
