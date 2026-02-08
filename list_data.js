
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listData() {
    const workspaceId = 'cmlbjb9lu0000hukzeod3zddo';
    try {
        const matters = await prisma.matter.findMany({
            where: { workspaceId },
            include: {
                _count: { select: { courtDates: true } },
                courtDates: {
                    select: { id: true, date: true, title: true, proceedings: true }
                }
            }
        });

        console.log(`MATTERS_COUNT:${matters.length}`);
        matters.forEach(m => {
            console.log(`MATTER: ID=${m.id}, Name=${m.name}, DatesCount=${m._count.courtDates}`);
            m.courtDates.forEach(d => {
                console.log(`  DATE: ID=${d.id}, Date=${d.date}, Title=${d.title}, Proceedings=${d.proceedings ? d.proceedings.substring(0, 20) + '...' : 'null'}`);
            });
        });

        // Also check for ALL court dates to see if some are missing matter links
        const allDates = await prisma.courtDate.findMany({
            include: {
                matter: { select: { name: true, workspaceId: true } }
            }
        });
        console.log(`ALL_DATES_COUNT:${allDates.length}`);
        allDates.forEach(d => {
            if (!d.matter || d.matter.workspaceId !== workspaceId) {
                console.log(`FOREIGN_DATE: ID=${d.id}, Date=${d.date}, Matter=${d.matter?.name || 'ORPHANED'}, WS=${d.matter?.workspaceId || 'NULL'}`);
            }
        });

    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

listData();
