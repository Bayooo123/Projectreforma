
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Fetch all workspaces to identify ASCOLP
    const workspaces = await prisma.workspace.findMany();
    console.log('\nWorkspaces:');
    workspaces.forEach(ws => {
        console.log(`- ID: ${ws.id}, Name: ${ws.name}, Slug: ${ws.slug}`);
    });

    const ascolpWorkspace = workspaces.find(ws => ws.name.toUpperCase().includes('ASCOLP'));

    if (!ascolpWorkspace) {
        console.log('\nWARNING: ASCOLP workspace not found!');
    } else {
        console.log(`\nFound ASCOLP Workspace ID: ${ascolpWorkspace.id}`);

        // 2. Fetch matters for this workspace
        const matters = await prisma.matter.findMany({
            where: { workspaceId: ascolpWorkspace.id },
            include: {
                _count: {
                    select: { courtDates: true }
                }
            }
        });

        console.log(`\nMatters in ASCOLP (${matters.length}):`);
        matters.forEach(m => {
            console.log(`- Matter: ${m.name}, ID: ${m.id}, CourtDates: ${m._count.courtDates}`);
        });

        // 3. Check for any CourtDates that might be missing links or linked to other things
        const orphanedCourtDates = await prisma.courtDate.findMany({
            where: {
                OR: [
                    { matterId: { notIn: matters.map(m => m.id) } },
                    { briefId: '' },
                    { clientId: '' }
                ]
            },
            include: {
                matter: true
            }
        });

        if (orphanedCourtDates.length > 0) {
            console.log(`\nFound ${orphanedCourtDates.length} CourtDates not linked to ASCOLP matters:`);
            orphanedCourtDates.forEach(cd => {
                console.log(`- CourtDate ID: ${cd.id}, Matter ID: ${cd.matterId}, Matter Name: ${cd.matter?.name || 'Unknown'}`);
            });
        } else {
            console.log('\nNo orphaned CourtDates found among tracked matters.');
        }
    }

    console.log('\n--- DIAGNOSTIC END ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
