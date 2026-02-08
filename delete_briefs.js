
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteBriefs() {
    const idsToDelete = [
        'cmjn6u0w500043c2i1dppubsg', // 001 Chief Daramola
        'cmjvjsm1l0004tkd1uq88gxin'  // 002 ARIK AIR
    ];

    try {
        for (const id of idsToDelete) {
            console.log(`Deleting brief: ${id}`);

            // Delete dependent records manually if cascade is not certain
            await prisma.courtDate.deleteMany({ where: { briefId: id } });
            await prisma.briefActivityLog.deleteMany({ where: { briefId: id } });

            // Delete the brief
            const deleted = await prisma.brief.delete({
                where: { id }
            });
            console.log(`Successfully deleted brief: ${deleted.name} (${deleted.briefNumber})`);
        }
    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

deleteBriefs();
