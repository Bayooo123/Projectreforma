
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔨 Creating Document table manually...');
  try {
    // 1. Create Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Document" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "size" INTEGER NOT NULL,
        "briefId" TEXT NOT NULL,
        "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ocrStatus" TEXT NOT NULL DEFAULT 'pending',
        "ocrText" TEXT,

        CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Table "Document" created.');

    // 2. Create Index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Document_briefId_idx" ON "Document"("briefId");
    `);
    console.log('✅ Index created.');

    // 3. Add Foreign Key
    try {
      await prisma.$executeRawUnsafe(`
          ALTER TABLE "Document" ADD CONSTRAINT "Document_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
      console.log('✅ Foreign key added.');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⚠️ Foreign key already exists.');
      } else {
        console.log('⚠️ Could not add foreign key (might already exist or other issue):', e.message);
      }
    }

  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
