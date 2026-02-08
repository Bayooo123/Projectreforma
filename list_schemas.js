
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listSchemas() {
    try {
        const schemas = await prisma.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'extensions', 'auth', 'storage', 'realtime')
    `;
        console.log('SCHEMAS:' + JSON.stringify(schemas));
    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

listSchemas();
