const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCourtDates() {
    try {
        const totalCourtDates = await prisma.courtDate.count();
        console.log('Total CourtDate records:', totalCourtDates);

        const courtDatesWithDetails = await prisma.courtDate.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                matter: {
                    select: {
                        id: true,
                        name: true,
                        caseNumber: true,
                        workspaceId: true
                    }
                }
            }
        });

        console.log('\nRecent Court Dates:');
        courtDatesWithDetails.forEach(cd => {
            console.log(`- ID: ${cd.id}`);
            console.log(`  Matter: ${cd.matter.name} (${cd.matter.caseNumber})`);
            console.log(`  Date: ${cd.date}`);
            console.log(`  Proceedings: ${cd.proceedings ? cd.proceedings.substring(0, 50) + '...' : 'None'}`);
            console.log(`  Workspace: ${cd.matter.workspaceId}`);
            console.log('');
        });

        // Check matters
        const totalMatters = await prisma.matter.count();
        console.log('Total Matter records:', totalMatters);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCourtDates();
