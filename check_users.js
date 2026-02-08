
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { email: true, name: true, createdAt: true }
        });
        console.log('USERS:' + JSON.stringify(users));

        const matters = await prisma.matter.findMany({
            select: { id: true, name: true, createdAt: true, workspace: { select: { name: true } } }
        });
        console.log('MATTERS:' + JSON.stringify(matters));

    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
