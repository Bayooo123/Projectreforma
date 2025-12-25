
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsersConcise() {
    try {
        const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace" WHERE "name" = 'ASCOLP' LIMIT 1`;
        const workspace = workspaces[0];

        // Select ALL users to avoid column errors
        const allUsers: any = await prisma.$queryRaw`SELECT * FROM "User"`;

        let ascolpUsers: any[] = [];
        let bayoFound = false;

        if (workspace) {
            allUsers.forEach((u: any) => {
                const userWsId = u.workspaceId || u.workspace_id || u.WorkspaceId;
                if (userWsId === workspace.id) {
                    ascolpUsers.push(`${u.name || 'NoName'} <${u.email}>`);
                }
                if (u.email === 'bayo@ascolp.com') {
                    bayoFound = true;
                }
            });
        }

        console.log("=== ASCOLP USERS ===");
        ascolpUsers.forEach(u => console.log(u));
        console.log("====================");
        console.log(bayoFound ? "BAYO_STATUS: FOUND" : "BAYO_STATUS: NOT_FOUND");

    } catch (error) {
        console.log("ERROR");
    } finally {
        await prisma.$disconnect();
    }
}

listUsersConcise();
