import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Client Unification...');

    // 1. Fetch orphaned matters with raw client names
    const orphanedMatters = await prisma.matter.findMany({
        where: {
            clientId: null,
            clientNameRaw: { not: null }
        }
    });

    console.log(`Found ${orphanedMatters.length} matters to process.`);

    const processedClients = new Set<string>();

    for (const matter of orphanedMatters) {
        if (!matter.clientNameRaw) continue;

        const rawName = matter.clientNameRaw.trim();
        if (!rawName) continue;

        // Check if Client exists (case-insensitive search would be ideal, but Prisma basic is case-sen)
        // We'll check exact match first, or create new.
        let client = await prisma.client.findFirst({
            where: {
                workspaceId: matter.workspaceId,
                name: { equals: rawName, mode: 'insensitive' }
            }
        });

        if (!client) {
            console.log(`Creating new client: "${rawName}"...`);
            // Create dummy email if needed since email is unique/required? 
            // Checking schema: email is unique. We need a placeholder email.
            const placeholderEmail = `contact+${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

            try {
                client = await prisma.client.create({
                    data: {
                        name: rawName,
                        email: placeholderEmail, // Placeholder, user can update later
                        workspaceId: matter.workspaceId,
                        status: 'active'
                    }
                });
            } catch (e) {
                // Should not happen if normalized properly but fallback
                console.error(`Failed to create client "${rawName}":`, e);
                continue;
            }
        } else {
            if (!processedClients.has(client.id)) {
                console.log(`Linking to existing client: "${client.name}"`);
                processedClients.add(client.id);
            }
        }

        // Update Matter
        await prisma.matter.update({
            where: { id: matter.id },
            data: { clientId: client.id }
        });
    }

    console.log('Matters linked successfully.');

    // 2. Unify Briefs based on Matters
    console.log('\nUnifying Briefs...');
    const orphanedBriefs = await prisma.brief.findMany({
        where: {
            clientId: null,
            matterId: { not: null }
        },
        include: { matter: true }
    });

    let briefsUpdated = 0;
    for (const brief of orphanedBriefs) {
        if (brief.matter?.clientId) {
            await prisma.brief.update({
                where: { id: brief.id },
                data: { clientId: brief.matter.clientId }
            });
            briefsUpdated++;
        }
    }

    console.log(`Updated ${briefsUpdated} briefs with client info from matters.`);
    console.log('Unification Complete! Please verify in Analytics.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
