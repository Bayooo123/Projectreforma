
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const workspaceId = 'cmjmowtqq0003hr4hg9xotwn4'; // ASCOLP

async function main() {
    console.log('Starting cleanup for ASCOLP workspace...');

    // 1. Get all clients in workspace
    const clients = await prisma.client.findMany({
        where: { workspaceId },
        select: { id: true, name: true }
    });

    if (clients.length === 0) {
        console.log('No clients found in ASCOLP workspace.');
        return;
    }

    const clientIds = clients.map(c => c.id);
    console.log(`Found ${clients.length} clients to cleanup: ${clients.map(c => c.name).join(', ')}`);

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 2. Delete Payments connected to these clients
            const deletedPayments = await tx.payment.deleteMany({
                where: { clientId: { in: clientIds } }
            });
            console.log(`Deleted ${deletedPayments.count} payments.`);

            // 3. Delete Invoices connected to these clients
            // Note: Invoices might have payments pointing to them, but we deleted payments first.
            // Invoices might have items, cascade delete should handle items.
            const deletedInvoices = await tx.invoice.deleteMany({
                where: { clientId: { in: clientIds } }
            });
            console.log(`Deleted ${deletedInvoices.count} invoices.`);

            // 4. Unlink Matters (Set clientId to null)
            // Matters are preserved but become "orphan" (or ready for new client assignment)
            const updatedMatters = await tx.matter.updateMany({
                where: { clientId: { in: clientIds } },
                data: { clientId: null, clientNameRaw: null } // clientNameRaw might be used for display, nulling it too safely
            });
            console.log(`Unlinked ${updatedMatters.count} matters.`);

            // 5. Unlink Briefs (Set clientId to null) - NEW LOGIC
            // Briefs are preserved
            const updatedBriefs = await tx.brief.updateMany({
                where: { clientId: { in: clientIds } },
                data: { clientId: null }
            });
            console.log(`Unlinked ${updatedBriefs.count} briefs.`);

            // 6. Delete Client Communications
            const deletedComms = await tx.clientCommunication.deleteMany({
                where: { clientId: { in: clientIds } }
            });
            console.log(`Deleted ${deletedComms.count} client communications.`);

            // 7. Delete Clients
            const deletedClients = await tx.client.deleteMany({
                where: { id: { in: clientIds } }
            });

            return deletedClients;
        });

        console.log(`Successfully deleted ${result.count} clients and cleaned up related data.`);

    } catch (error) {
        console.error('Error during cleanup transaction:', error);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
