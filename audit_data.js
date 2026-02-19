const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
    const users = await prisma.user.findMany({
        include: {
            workspaces: {
                include: {
                    workspace: true
                }
            }
        }
    });

    console.log("--- User & Workspace Audit ---");
    for (const user of users) {
        console.log(`User: ${user.name} (${user.email}) [ID: ${user.id}]`);
        for (const membership of user.workspaces) {
            const ws = membership.workspace;
            const briefCount = await prisma.brief.count({
                where: { workspaceId: ws.id, deletedAt: null }
            });
            console.log(`  - Workspace: ${ws.name} [ID: ${ws.id}] (Role: ${membership.role})`);
            console.log(`    - Briefs: ${briefCount}`);
        }
    }

    // Check if there are orphaned briefs
    const totalBriefs = await prisma.brief.count({ where: { deletedAt: null } });
    console.log(`\nTotal Active Briefs in DB: ${totalBriefs}`);
}

audit().catch(console.error).finally(() => prisma.$disconnect());
