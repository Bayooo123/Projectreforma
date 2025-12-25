
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listWorkspaceUsers() {
    try {
        // 1. Find the Workspace - Strictly quoted identifiers
        const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace" WHERE "name" = 'ASCOLP' LIMIT 1`;
        const workspace = workspaces[0];

        if (!workspace) {
            console.log('Workspace "ASCOLP" not found.');
            return;
        }

        console.log(`--- Workspace: ${workspace.name} (${workspace.id}) ---`);

        // 2. Check for 'bayo@ascolp.com' - Quoted table and column
        const specificUser: any = await prisma.$queryRaw`SELECT * FROM "User" WHERE "email" = 'bayo@ascolp.com' LIMIT 1`;
        console.log(`Specific User Check Count: ${specificUser.length}`);

        // 3. List ALL users in this workspace - Quoted foreign key "workspaceId"
        const allUsers: any = await prisma.$queryRaw`SELECT * FROM "User" WHERE "workspaceId" = ${workspace.id}`;

        console.log(`\n--- Registered Users in ASCOLP (${allUsers.length}) ---`);
        if (allUsers.length > 0) {
            // Just log the raw object keys to see what we actually have
            console.log("First User Row Keys:", Object.keys(allUsers[0]));
        }

        allUsers.forEach((u: any, index: number) => {
            // Handle potential casing or missing fields gracefully
            const name = u.name || u.Name || "Unknown";
            const email = u.email || u.Email || "Unknown";
            // 'role' might be missing if schema drift, but let's try
            const role = u.role || u.Role || "N/A";
            console.log(`[${index + 1}] ${name} (${email}) | Role: ${role}`);
        });
        console.log('-------------------------------------------');

    } catch (error) {
        console.error('Error listing users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listWorkspaceUsers();
