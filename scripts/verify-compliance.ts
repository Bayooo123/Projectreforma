import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting Compliance Module Verification...');

    // 1. Check Obligations
    const obligations = await prisma.complianceObligation.count();
    console.log(`- Found ${obligations} compliance obligations in registry.`);
    if (obligations === 0) throw new Error('No obligations found in registry!');

    // 2. Check Tasks
    const tasks = await prisma.complianceTask.count();
    console.log(`- Found ${tasks} workspace compliance tasks.`);
    if (tasks === 0) throw new Error('No compliance tasks found!');

    // 3. Detailed Check for one Workspace
    const workspace = await prisma.workspace.findFirst({
        include: {
            complianceTasks: {
                include: {
                    obligation: true
                }
            }
        }
    });

    if (workspace) {
        console.log(`- Workspace "${workspace.name}" has ${workspace.complianceTasks.length} tasks.`);
        const tiers = new Set(workspace.complianceTasks.map(t => t.obligation.tier));
        console.log(`- Obligations cover tiers: ${Array.from(tiers).join(', ')}`);
    }

    // 4. Check Roles in a Workspace
    const membersWithRoles = await prisma.workspaceMember.findMany({
        where: {
            OR: [
                { role: { in: ['owner', 'partner'] } },
                { designation: { in: ['Head of Chambers', 'Practice Manager', 'Principal Partner'] } }
            ]
        },
        take: 5
    });

    console.log(`- Found ${membersWithRoles.length} management/partner members for notification targeting.`);

    console.log('✅ Verification successful! Data models and associations are intact.');
}

main()
    .catch((e) => {
        console.error('❌ Verification failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
