
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAbiolaUser() {
    try {
        // 1. Find the Workspace
        const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace" WHERE "name" = 'abiolasanniandco' LIMIT 1`;
        const workspace = workspaces[0];

        if (!workspace) {
            console.log('Workspace "abiolasanniandco" not found.');
            return;
        }

        console.log(`--- Workspace: ${workspace.name} (${workspace.id}) ---`);
        console.log(`Firm Code: ${workspace.firmCode}`);

        // 2. Search for the user
        // The user asked for "bayo@abiolasanniandco", likely "bayo@abiolasanniandco.com"
        const searchEmail = 'bayo@abiolasanniandco.com';

        // Using string matching just in case
        const users: any = await prisma.$queryRaw`SELECT * FROM "User" WHERE "email" LIKE '%bayo@abiolasanniandco%'`;

        if (users.length === 0) {
            console.log(`User matching 'bayo@abiolasanniandco' NOT found.`);
        } else {
            console.log(`Found ${users.length} matching user(s):`);
            users.forEach((u: any) => {
                const userWsId = u.workspaceId || u.workspace_id || u.WorkspaceId;
                const isMember = userWsId === workspace.id;

                console.log(`- Name: ${u.name}`);
                console.log(`  Email: ${u.email}`);
                console.log(`  WorkspaceID: ${userWsId}`);
                console.log(`  Is Member of 'abiolasanniandco': ${isMember ? 'YES ✅' : 'NO ❌'}`);

                if (isMember) {
                    console.log(`  Role: ${u.role}`);
                }
            });
        }

    } catch (error) {
        console.error('Error checking user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAbiolaUser();
