import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Integrity Check ---');

    // 1. Check Workspaces
    const workspaces: any[] = await prisma.$queryRaw`SELECT id, name, slug, "createdAt" FROM "Workspace"`;
    console.log(`\nWorkspaces found: ${workspaces.length}`);
    workspaces.forEach(ws => {
        console.log(` - ID: ${ws.id} | Name: ${ws.name} | Slug: ${ws.slug} | Created: ${ws.createdAt}`);
    });

    // 2. Check for "Orphaned" or existing data
    const briefCount = await prisma.brief.count();
    const matterCount = await prisma.matter.count();
    const clientCount = await prisma.client.count();
    const taskCount = await prisma.complianceTask.count();

    console.log(`\nData Counts:`);
    console.log(` - Briefs: ${briefCount}`);
    console.log(` - Matters: ${matterCount}`);
    console.log(` - Clients: ${clientCount}`);
    console.log(` - Compliance Tasks: ${taskCount}`);

    if (briefCount > 0) {
        const briefSample: any[] = await prisma.$queryRaw`SELECT "workspaceId", COUNT(*) as count FROM "Brief" GROUP BY "workspaceId"`;
        console.log(`\nBrief Distribution by Workspace ID:`);
        briefSample.forEach(b => console.log(` - WorkspaceID: ${b.workspaceId} | Count: ${b.count}`));
    }

    // 3. User distribution
    const userMembers: any[] = await prisma.$queryRaw`SELECT "workspaceId", COUNT(*) as count FROM "WorkspaceMember" GROUP BY "workspaceId"`;
    console.log(`\nMembership Distribution:`);
    userMembers.forEach(m => console.log(` - WorkspaceID: ${m.workspaceId} | Count: ${m.count}`));

    console.log('\n--- Done ---');
}

main().finally(() => prisma.$disconnect());
