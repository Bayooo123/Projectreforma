const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    console.log('Searching for users related to Bayo...');
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: 'bayo', mode: 'insensitive' } },
                { name: { contains: 'bayo', mode: 'insensitive' } },
                { name: { contains: 'gbadebo', mode: 'insensitive' } }
            ]
        }
    });

    console.table(users);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
