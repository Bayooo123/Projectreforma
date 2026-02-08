
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'dhaveedace@gmail.com' }
        });
        console.log('USER_CHECK:' + JSON.stringify(user));

        const matters = await prisma.matter.findMany({
            select: { id: true, name: true, workspaceId: true, nextCourtDate: true }
        });
        console.log('MATTERS:' + JSON.stringify(matters));

        const allDates = await prisma.courtDate.count();
        console.log('COURT_DATE_COUNT:' + allDates);

    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
