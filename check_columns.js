const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Check columns for table "Brief" (Prisma usually maps to "Brief" or "briefs" depending on config, default is Model name)
        // Actually mapped name might be "Brief" if no map/map.
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Brief' OR table_name = 'briefs' OR table_name = 'Briefs';
    `;
        console.log('COLUMNS:', JSON.stringify(result));
    } catch (e) {
        console.log('QUERY ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
