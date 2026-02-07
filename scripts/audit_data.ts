import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Data Audit...');

    // 1. Audit Matters
    const orphanedMatters = await prisma.matter.findMany({
        where: {
            clientId: null
        },
        select: {
            id: true,
            name: true,
            clientNameRaw: true,
            workspaceId: true
        }
    });

    console.log(`\nFound ${orphanedMatters.length} orphaned matters (no clientId):`);
    orphanedMatters.forEach(m => {
        console.log(`- [Matter] "${m.name}" | Client Raw: "${m.clientNameRaw || 'N/A'}" | ID: ${m.id}`);
    });

    // 2. Audit Briefs
    const orphanedBriefs = await prisma.brief.findMany({
        where: {
            clientId: null
        },
        select: {
            id: true,
            name: true,
            briefNumber: true,
            workspaceId: true
        }
    });

    console.log(`\nFound ${orphanedBriefs.length} orphaned briefs (no clientId):`);
    orphanedBriefs.forEach(b => {
        console.log(`- [Brief] "${b.name}" (${b.briefNumber}) | ID: ${b.id}`);
    });

    // 3. Count Total Clients
    const totalClients = await prisma.client.count();
    console.log(`\nTotal registered Clients: ${totalClients}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
