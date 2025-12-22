const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const brief = await prisma.brief.findFirst();
        console.log('Brief Connect Success. First ID:', brief?.id);
    } catch (e) {
        console.log('CONNECTION ERROR:', e.message);
        if (e.meta) console.log('META:', e.meta);
    } finally {
        await prisma.$disconnect();
    }
}

main();
