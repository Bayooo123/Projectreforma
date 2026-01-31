const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
    try {
        // Try to query without including related fields
        const courtDates = await prisma.$queryRaw`
            SELECT 
                id, 
                "matterId", 
                date, 
                title, 
                proceedings, 
                outcome,
                "adjournedFor",
                "createdAt",
                "updatedAt"
            FROM "CourtDate" 
            ORDER BY "createdAt" DESC 
            LIMIT 10
        `;

        console.log('Court Dates in Database:');
        console.log(JSON.stringify(courtDates, null, 2));

        // Check what columns actually exist
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'CourtDate'
            ORDER BY ordinal_position
        `;

        console.log('\n\nActual CourtDate table columns:');
        console.log(JSON.stringify(columns, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
