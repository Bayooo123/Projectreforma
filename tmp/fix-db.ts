import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Altering Brief table to make briefId nullable...');
  await prisma.$executeRawUnsafe('ALTER TABLE "Brief" ALTER COLUMN "briefId" DROP NOT NULL;');
  console.log('✅ Altered Brief table successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Failed to alter Brief table:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
