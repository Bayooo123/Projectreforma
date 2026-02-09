
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    const clientIds = [
        'cmjn6t43300013c2ikoy36gd0', // Chief Daramola
        'cmjvjsjx40001tkd1by7qztt3'  // Arik air
    ];

    const matterIds = [
        'cmlbl1j250001g729qt3ehjtm', // A v. K
        'cmlbl1l7y0003g729vfc8nwky'  // State v. Arik Air
    ];

    try {
        // Delete dependent records for matters if any (e.g. CourtDates)
        console.log('Deleting court dates...');
        await prisma.courtDate.deleteMany({
            where: { matterId: { in: matterIds } }
        });

        console.log('Deleting matters...');
        await prisma.matter.deleteMany({
            where: { id: { in: matterIds } }
        });

        // Delete invoices/payments for clients first
        console.log('Deleting client related financial records...');
        await prisma.payment.deleteMany({ where: { clientId: { in: clientIds } } });
        await prisma.invoice.deleteMany({ where: { clientId: { in: clientIds } } });

        console.log('Deleting clients...');
        await prisma.client.deleteMany({
            where: { id: { in: clientIds } }
        });

        console.log('Cleanup complete.');
    } catch (e) {
        console.error('ERROR:' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
