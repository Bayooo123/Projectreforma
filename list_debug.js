const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    console.log('--- Workspaces ---');
    const workspaces = await prisma.workspace.findMany();
    workspaces.forEach(w => console.log(`${w.name} (${w.firmCode}) - ID: ${w.id}`));

    console.log('\n--- Users matching "Sanni" ---');
    const users = await prisma.user.findMany({
        where: { name: { contains: 'Sanni', mode: 'insensitive' } }
    });
    console.log(users);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
