
import { prisma } from '../src/lib/prisma';
import { DocumentIngestionService } from '../src/lib/services/ingestion';

async function backfill() {
    console.log('🔍 Starting synchronization of email attachments to Document Vault...');

    // 1. Find all InboundEmail records through PulseEvents that have a briefId
    const pulseEvents = await prisma.pulseEvent.findMany({
        where: {
            briefId: { not: null },
            inboundEmailId: { not: null }
        },
        include: {
            inboundEmail: {
                include: {
                    attachments: true
                }
            }
        }
    });

    console.log(`📑 Found ${pulseEvents.length} pulse events linked to briefs and emails.`);

    let totalMigrated = 0;

    for (const event of pulseEvents) {
        const briefId = event.briefId;
        const workspaceId = event.workspaceId;
        const email = event.inboundEmail;

        if (!briefId || !workspaceId || !email) continue;

        for (const att of email.attachments) {
            // Check if this document already exists in the brief vault
            const existing = await prisma.document.findFirst({
                where: { briefId, url: att.url }
            });

            if (existing) {
                console.log(`⏩ Skipping "${att.name}" — already in vault.`);
                continue;
            }

            console.log(`🚀 Migrating "${att.name}" to Brief Vault...`);

            try {
                // Fetch the file content from the URL using native fetch
                const response = await fetch(att.url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const folder = await DocumentIngestionService.getOrCreateCorrespondenceFolder(briefId, workspaceId);

                await DocumentIngestionService.ingest({
                    name: att.name,
                    buffer,
                    contentType: att.contentType,
                    size: att.size,
                    briefId,
                    folderId: folder.id,
                    url: att.url
                });

                totalMigrated++;
                console.log(`✅ Successfully migrated "${att.name}".`);
            } catch (err) {
                console.error(`❌ Failed to migrate "${att.name}":`, err);
            }
        }
    }

    console.log(`✨ Migration complete. Total documents added to vaults: ${totalMigrated}`);
}

backfill()
    .catch(err => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
