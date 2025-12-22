const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const brief = await prisma.brief.findFirst();
    console.log('First Brief:', brief);
}

main();
