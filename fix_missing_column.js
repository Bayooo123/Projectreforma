const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking for inboundEmailId column...');

        // 1. Check if column exists
        const cols = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Brief' AND column_name = 'inboundEmailId';
    `;

        if (cols.length > 0) {
            console.log('✅ Column inboundEmailId already exists.');
        } else {
            console.log('⚠️ Column missing. Attempting to add it manually...');

            // 2. Add Column
            await prisma.$executeRawUnsafe(`ALTER TABLE "Brief" ADD COLUMN "inboundEmailId" TEXT;`);
            console.log('-> Column added.');

            // 3. Backfill with UUIDs (Postgres specific)
            // Use crypto extension or just random string fallback if gen_random_uuid not available (it usually is in pg 13+)
            try {
                await prisma.$executeRawUnsafe(`UPDATE "Brief" SET "inboundEmailId" = gen_random_uuid() WHERE "inboundEmailId" IS NULL;`);
            } catch (e) {
                // Fallback if gen_random_uuid fails, use text concatenation or md5
                console.log('gen_random_uuid failed, using fallback update...');
                await prisma.$executeRawUnsafe(`UPDATE "Brief" SET "inboundEmailId" = md5(random()::text) WHERE "inboundEmailId" IS NULL;`);
            }
            console.log('-> Data backfilled.');

            // 4. Add Unique Index
            await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "Brief_inboundEmailId_key" ON "Brief"("inboundEmailId");`);
            console.log('-> Unique Index created.');

            console.log('✅ Surgical Fix Complete.');
        }

    } catch (e) {
        console.log('SQL ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
