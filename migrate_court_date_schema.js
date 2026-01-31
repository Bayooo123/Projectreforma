const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateCourtDateSchema() {
    try {
        console.log('Starting CourtDate schema migration...\n');

        console.log('Executing SQL migration...\n');

        // Execute ALTER TABLE to add columns
        console.log('Adding missing columns to CourtDate table...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "CourtDate" 
            ADD COLUMN IF NOT EXISTS "submittingLawyerId" TEXT,
            ADD COLUMN IF NOT EXISTS "submittingLawyerToken" TEXT,
            ADD COLUMN IF NOT EXISTS "submittingLawyerName" TEXT
        `);
        console.log('✓ Columns added successfully!\n');

        // Execute CREATE INDEX separately
        console.log('Creating index for performance...');
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "CourtDate_submittingLawyerId_idx" 
            ON "CourtDate"("submittingLawyerId")
        `);
        console.log('✓ Index created successfully!\n');

        // Verify the new columns exist
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'CourtDate'
            ORDER BY ordinal_position
        `;

        console.log('Current CourtDate table schema:');
        console.table(columns);

        // Test that Prisma can now query the table
        console.log('\nTesting Prisma query...');
        const courtDates = await prisma.courtDate.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                matter: {
                    select: {
                        name: true,
                        caseNumber: true
                    }
                }
            }
        });

        console.log(`\n✓ Successfully retrieved ${courtDates.length} court date records!`);
        console.log('\nSample records:');
        courtDates.forEach((cd, idx) => {
            console.log(`\n${idx + 1}. ${cd.matter.name} (${cd.matter.caseNumber})`);
            console.log(`   Date: ${cd.date.toISOString().split('T')[0]}`);
            console.log(`   Proceedings: ${cd.proceedings ? cd.proceedings.substring(0, 80) + '...' : 'None'}`);
        });

        // Get total count
        const totalCount = await prisma.courtDate.count();
        console.log(`\n✓ Total court date records in database: ${totalCount}`);

        console.log('\n✅ Migration completed successfully!');
        console.log('All litigation tracker records should now be visible in the UI.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

migrateCourtDateSchema();
