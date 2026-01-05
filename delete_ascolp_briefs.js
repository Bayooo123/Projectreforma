const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    console.log('Searching for ASCOLP workspace...');

    // Find workspace by iterating or precise match if possible
    // Since 'mode' failed, database might be SQLite or similar.
    // Fetch all workspaces and filter in JS to be safe.
    const workspaces = await prisma.workspace.findMany();
    const workspace = workspaces.find(w => w.name.toUpperCase().includes('ASCOLP'));

    if (!workspace) {
        console.error('ASCOLP workspace not found.');
        return;
    }

    console.log(`Found workspace: ${workspace.name} (${workspace.id})`);

    const targets = ['chief daramola', 'arik air'];

    // Fetch all briefs for this workspace
    console.log('Fetching all briefs for workspace...');
    const allBriefs = await prisma.brief.findMany({
        where: { workspaceId: workspace.id }
    });

    console.log(`Found ${allBriefs.length} total briefs.`);

    for (const target of targets) {
        console.log(`\nSearching for briefs matching: "${target}"...`);

        const matches = allBriefs.filter(b => b.title && b.title.toLowerCase().includes(target));

        if (matches.length === 0) {
            console.log(`No briefs found for "${target}".`);
        } else {
            for (const brief of matches) {
                console.log(`Deleting brief: "${brief.title}" (${brief.id})...`);
                await prisma.brief.delete({ where: { id: brief.id } });
                console.log(`✅ Deleted.`);
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
