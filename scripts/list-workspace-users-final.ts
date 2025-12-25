
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listWorkspaceUsers() {
    try {
        // 1. Get Workspace (SELECT * worked before)
        const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace" WHERE "name" = 'ASCOLP' LIMIT 1`;
        const workspace = workspaces[0];

        if (!workspace) {
            console.log('Workspace "ASCOLP" not found.');
            return;
        }

        console.log(`--- Workspace: ${workspace.name} ---`);
        console.log(`Firm Code: ${workspace.firmCode}`); // This worked before so the key exists on the returned object

        // 2. Get All Users (SELECT * to avoid column name guessing)
        const allUsers: any = await prisma.$queryRaw`SELECT * FROM "User" WHERE "workspaceId" = ${workspace.id}`;

        console.log(`\n--- Registered Users (${allUsers.length}) ---`);

        // Debug: Print keys of first user to see strict column names
        if (allUsers.length > 0) {
            console.log("User Columns Found:", Object.keys(allUsers[0]).join(', '));
        }

        let targetFound = false;

        allUsers.forEach((u: any) => {
            // Robust field access
            const name = u.name || u.Name || 'Unknown';
            const email = u.email || u.Email || 'Unknown';
            const role = u.role || u.Role || 'Unknown'; // Check keys above if this says Unknown

            console.log(`- ${name} (${email}) | Role: ${role}`);

            if (email === 'bayo@ascolp.com') {
                targetFound = true;
            }
        });

        console.log('---------------------------');
        if (targetFound) {
            console.log("Verdict: 'bayo@ascolp.com' IS registered.");
        } else {
            console.log("Verdict: 'bayo@ascolp.com' is NOT registered.");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listWorkspaceUsers();
