const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
    console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);

    const users = await prisma.user.findMany({
        take: 5,
        include: {
            workspaces: {
                include: {
                    workspace: true
                }
            }
        }
    });

    console.log("\n--- USER WORKSPACE AUDIT ---");
    for (const user of users) {
        console.log(`\nUser: ${user.name} (${user.email}) [ID: ${user.id}]`);
        if (user.workspaces.length === 0) {
            console.log("  ❌ No workspaces found for this user.");
            continue;
        }

        for (const membership of user.workspaces) {
            const ws = membership.workspace;
            const briefCount = await prisma.brief.count({
                where: { workspaceId: ws.id, deletedAt: null }
            });
            const matterCount = await prisma.matter.count({
                where: { workspaceId: ws.id }
            });
            console.log(`  - [${briefCount} briefs, ${matterCount} matters] Workspace: "${ws.name}" [ID: ${ws.id}] (Role: ${membership.role})`);
            if (ws.ownerId === user.id) {
                console.log(`    ⭐ OWNER of this workspace`);
            }
        }
    }

    console.log("\n--- GLOBAL STATS ---");
    const totalBriefs = await prisma.brief.count({ where: { deletedAt: null } });
    const deletedBriefs = await prisma.brief.count({ where: { NOT: { deletedAt: null } } });
    const totalWorkspaces = await prisma.workspace.count();

    console.log(`Total Workspaces: ${totalWorkspaces}`);
    console.log(`Total Active Briefs: ${totalBriefs}`);
    console.log(`Total Deleted/Archived Briefs: ${deletedBriefs}`);

}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
