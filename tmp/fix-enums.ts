import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Mapping old CalendarEventType values to new ones...');

  // Since we are about to change the enum, we should do this via raw SQL 
  // because the Prisma Client might be out of sync with the schema.
  
  try {
    // 1. Update data to match new expected values before we force the enum change
    // We'll use strings that match our proposed enum: COURT, MEETING
    
    await prisma.$executeRawUnsafe(`
      UPDATE "CalendarEntry" 
      SET "type" = 'COURT' 
      WHERE "type"::text = 'COURT_DATE' OR "type"::text = 'FILING_DEADLINE'
    `);
    
    await prisma.$executeRawUnsafe(`
      UPDATE "CalendarEntry" 
      SET "type" = 'MEETING' 
      WHERE "type"::text = 'CLIENT_MEETING' OR "type"::text = 'INTERNAL_MEETING'
    `);
    
    await prisma.$executeRawUnsafe(`
      UPDATE "CalendarEntry" 
      SET "type" = 'COURT' 
      WHERE "type"::text = 'OTHER'
    `);

    console.log('Successfully mapped existing data.');
  } catch (error) {
    console.error('Error mapping data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
