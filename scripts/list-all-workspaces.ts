
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllWorkspaces() {
    try {
        // Select all workspaces
        const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace"`;

        console.log(`\n--- Available Workspaces (${workspaces.length}) ---`);
        if (workspaces.length === 0) {
            console.log("No workspaces found.");
        } else {
            workspaces.forEach((ws: any) => {
                console.log(`- Name: "${ws.name}"`);
                console.log(`  Firm Code: ${ws.firmCode}`);
                console.log(`  ID: ${ws.id}`);
                console.log(`  Join Password (Hash): ${ws.joinPassword ? ws.joinPassword.substring(0, 10) + '...' : 'None'}`);
                console.log(`  MAGIC LINK TOKEN: ${ws.inviteLinkToken || 'NULL'}`);
                console.log('');
            });
        }
        console.log('-----------------------------------');

    } catch (error) {
        console.error('Error listing workspaces:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listAllWorkspaces();
