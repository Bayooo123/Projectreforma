
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const workspaceId = 'cmjmowtqq0003hr4hg9xotwn4'; // ASCOLP

async function main() {
    // 1. Get all clients in workspace
    const clients = await prisma.client.findMany({
        where: { workspaceId },
        include: {
            _count: {
                select: {
                    briefs: true,
                    matters: true,
                    invoices: true,
                    payments: true,
                    clientCommunications: true
                }
            },
            briefs: { select: { id: true, name: true } },
            matters: { select: { id: true, name: true } }
        }
    });

    console.log(`Found ${clients.length} clients in ASCOLP.`);

    for (const c of clients) {
        console.log(`\nClient: ${c.name} (${c.id})`);
        console.log(`- Invoices: ${c._count.invoices}`);
        console.log(`- Payments: ${c._count.payments}`);
        console.log(`- Briefs: ${c._count.briefs}`);
        if (c.briefs.length > 0) {
            c.briefs.forEach(b => console.log(`  * Brief: ${b.name}`));
        }
        console.log(`- Matters: ${c._count.matters}`);
        if (c.matters.length > 0) {
            c.matters.forEach(m => console.log(`  * Matter: ${m.name}`));
        }
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
