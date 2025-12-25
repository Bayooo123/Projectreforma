
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function manualMigration() {
    try {
        console.log('Starting manual migration...');

        // 1. Add Column
        console.log('Adding "inviteLinkToken" column...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Workspace" 
      ADD COLUMN IF NOT EXISTS "inviteLinkToken" TEXT;
    `);

        // 2. Add Unique Index
        console.log('Adding Unique Index...');
        await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_inviteLinkToken_key" 
        ON "Workspace"("inviteLinkToken");
    `);

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

manualMigration();
