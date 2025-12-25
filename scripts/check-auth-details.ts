
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAuthDetails() {
    try {
        // USE RAW SQL to bypass any model/schema validation issues
        const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace" WHERE "name" = 'ASCOLP' LIMIT 1`;
        const users: any = await prisma.$queryRaw`SELECT * FROM "User" WHERE "email" = 'bayo@abiolasanniandco.com' LIMIT 1`;

        const workspace = workspaces[0];
        const user = users[0];

        console.log('--- Auth Details ---');
        if (workspace) {
            console.log(`Workspace: ${workspace.name}`);
            console.log(`Firm Code: ${workspace.firmCode}`);
            console.log(`Join Password: ${workspace.joinPassword}`);
        } else {
            console.log('Workspace "ASCOLP" not found.');
        }

        if (user) {
            console.log(`User: ${user.name} (${user.email})`);
            console.log(`Role: ${user.role}`);
            console.log(`Email Verified: ${user.emailVerified}`);
        } else {
            console.log('User "bayo@abiolasanniandco.com" not found.');
        }
        console.log('--------------------');
        console.log('DONE');

    } catch (error) {
        console.error('Error fetching details:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAuthDetails();
