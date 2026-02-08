
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTables() {
    try {
        const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
        console.log('TABLES:' + JSON.stringify(tables));
    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

listTables();
