import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspaceId = 'cmlteuiz40003ym902kk2jhfv';
  const lawyerId = 'cm8821zlt0000u67j387m670z';

  console.log('--- DB DIAGNOSTICS ---');
  
  // 1. Check columns in Brief table
  console.log('Checking columns in "Brief" table...');
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Brief'
  `);
  console.log('Columns:', JSON.stringify(columns, null, 2));

  // 2. Check triggers on Brief table
  console.log('Checking triggers on "Brief" table...');
  const triggers = await prisma.$queryRawUnsafe(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'Brief'
  `);
  console.log('Triggers:', JSON.stringify(triggers, null, 2));

  // 3. Try raw insert
  console.log('Attempting raw insert into "Brief"...');
  try {
    const id = 'diag-brief-' + Date.now();
    const briefNumber = 'DIAG-B-' + Date.now();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Brief" ("id", "briefNumber", "name", "lawyerId", "workspaceId", "category", "status", "updatedAt")
      VALUES ('${id}', '${briefNumber}', 'Diag Brief', '${lawyerId}', '${workspaceId}', 'Litigation', 'active', NOW())
    `);
    console.log('✅ Raw insert successful!');
  } catch (e: any) {
    console.error('❌ Raw insert failed:', e.message);
  }
}

main().finally(() => prisma.$disconnect());
