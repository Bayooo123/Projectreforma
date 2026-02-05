
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

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

    let output = `Found ${clients.length} clients in ASCOLP.\n`;

    for (const c of clients) {
        output += `\nClient: ${c.name} (${c.id})\n`;
        output += `- Invoices: ${c._count.invoices}\n`;
        output += `- Payments: ${c._count.payments}\n`;
        output += `- Briefs: ${c._count.briefs}\n`;
        if (c.briefs.length > 0) {
            c.briefs.forEach(b => output += `  * Brief: ${b.name}\n`);
        }
        output += `- Matters: ${c._count.matters}\n`;
        if (c.matters.length > 0) {
            c.matters.forEach(m => output += `  * Matter: ${m.name}\n`);
        }
    }

    fs.writeFileSync('client_analysis.txt', output);
    console.log('Written to client_analysis.txt');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
