
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOwner() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'gbadeboadebayo1000@gmail.com' }
        });
        console.log('OWNER_CHECK:' + JSON.stringify(user));

        const allUsers = await prisma.user.findMany({
            select: { email: true }
        });
        console.log('ALL_USERS:' + JSON.stringify(allUsers));

    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

findOwner();
