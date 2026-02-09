import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- USERS ---');
    const users = await prisma.user.findMany();
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- WORKSPACES ---');
    const workspaces = await prisma.workspace.findMany();
    console.log(JSON.stringify(workspaces, null, 2));

    console.log('\n--- WORKSPACE MEMBERS ---');
    const members = await prisma.workspaceMember.findMany({
        include: {
            user: true,
            workspace: true
        }
    });
    console.log(JSON.stringify(members, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
