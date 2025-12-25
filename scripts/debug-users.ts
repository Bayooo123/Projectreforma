
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllUsers() {
    try {
        // 1. Get Workspace
        const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace" WHERE "name" = 'ASCOLP' LIMIT 1`;
        const workspace = workspaces[0];

        if (workspace) {
            console.log(`Target Workspace ID: ${workspace.id} (FirmCode: ${workspace.firmCode})`);
        }

        // 2. Get ALL Users (No WHERE clause to avoid column errors)
        const allUsers: any = await prisma.$queryRaw`SELECT * FROM "User"`;

        console.log(`\nTotal Users Found: ${allUsers.length}`);

        if (allUsers.length > 0) {
            console.log('User Table Columns:', Object.keys(allUsers[0]).join(', '));
        }

        let ascolpUsers = [];
        let bayoFound = false;

        allUsers.forEach((u: any) => {
            // Try to identify workspace ID column
            // Common variations: workspaceId, workspace_id, WorkspaceId
            const userWsId = u.workspaceId || u.workspace_id || u.WorkspaceId;

            if (workspace && userWsId === workspace.id) {
                ascolpUsers.push(u);
            }

            if (u.email === 'bayo@ascolp.com') {
                bayoFound = true;
                console.log(`\n!!! FOUND bayo@ascolp.com !!!`);
                console.log(u);
            }
        });

        console.log(`\nUsers explicitly linked to ASCOLP (${ascolpUsers.length}):`);
        ascolpUsers.forEach((u: any) => {
            console.log(`- ${u.name} (${u.email})`);
        });

        if (!bayoFound) {
            console.log("\nUser 'bayo@ascolp.com' was NOT found in the entire database.");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listAllUsers();
