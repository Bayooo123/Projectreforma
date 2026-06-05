/**
 * One-time script: create "unassigned" briefs for all real matters
 * that do not yet have a linked brief.
 *
 * Run: node scripts/backfill-matter-briefs.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const WS_ID   = 'cmle84eye0002r9dbovl388l8';
const USER_ID  = 'cmle84eff0000r9dbkqulwcku';

// Names of seed/demo matters to skip
const SKIP_NAMES = ['Demo Matter', 'Full Demo Matter'];

async function run() {
    // 1. All matters in workspace
    const matters = await prisma.matter.findMany({
        where: { workspaceId: WS_ID },
        orderBy: { createdAt: 'asc' },
    });

    // 2. Matter IDs that already have at least one non-deleted brief
    const existing = await prisma.brief.findMany({
        where: { workspaceId: WS_ID, deletedAt: null, matterId: { not: null } },
        select: { matterId: true },
    });
    const coveredIds = new Set(existing.map(b => b.matterId));

    // 3. Filter to matters that need a brief (real matters only)
    const toCreate = matters.filter(m =>
        !coveredIds.has(m.id) &&
        !SKIP_NAMES.includes(m.name.trim())
    );

    console.log(`\n${toCreate.length} matters need briefs:\n`);
    toCreate.forEach(m => console.log(`  • ${m.name} (${m.status})`));

    if (toCreate.length === 0) {
        console.log('Nothing to do.');
        return;
    }

    // 4. Get current brief count for sequential numbering
    const currentCount = await prisma.brief.count({ where: { workspaceId: WS_ID } });

    let created = 0;
    for (let i = 0; i < toCreate.length; i++) {
        const matter = toCreate[i];
        const seqNum = currentCount + i + 1;
        const briefNumber = `BRF-${String(seqNum).padStart(3, '0')}`;

        // Avoid collisions (paranoia check)
        const collision = await prisma.brief.findUnique({ where: { briefNumber } });
        const finalBriefNumber = collision
            ? `BRF-${String(seqNum).padStart(3, '0')}-${Date.now()}`
            : briefNumber;

        await prisma.brief.create({
            data: {
                briefNumber: finalBriefNumber,
                name: matter.name,
                workspaceId: WS_ID,
                lawyerId: USER_ID,
                lawyerInChargeId: USER_ID,
                matterId: matter.id,
                category: 'Litigation',
                status: 'unassigned',
                isLitigationDerived: true,
                description: `Brief auto-created from matter "${matter.name}". Pending assignment to lawyer-in-charge.`,
            },
        });

        console.log(`  ✓ Created ${finalBriefNumber}  →  ${matter.name}`);
        created++;
    }

    console.log(`\n✅ Done. ${created} brief(s) created with status "unassigned".\n`);
}

run()
    .catch(err => { console.error(err); process.exit(1); })
    .finally(() => prisma.$disconnect());
