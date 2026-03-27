import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DB VISIBILITY CHECK ---');
  
  const dbName = await prisma.$queryRawUnsafe('SELECT current_database();');
  console.log('Current DB:', JSON.stringify(dbName));

  try {
    const row = await prisma.$queryRawUnsafe('SELECT id FROM "Brief" LIMIT 1;');
    console.log('✅ Found "Brief" table. Row count (1):', JSON.stringify(row));
  } catch (e: any) {
    console.error('❌ Could not see "Brief" table:', e.message);
  }

  try {
    const row = await prisma.$queryRawUnsafe('SELECT id FROM Brief LIMIT 1;');
    console.log('✅ Found Brief table (no quotes). Row count (1):', JSON.stringify(row));
  } catch (e: any) {
    console.error('❌ Could not see Brief table (no quotes):', e.message);
  }
}

main().finally(() => prisma.$disconnect());
