import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing workspaces...');
    try {
        const workspaces = await prisma.workspace.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log(`Found ${workspaces.length} recent workspaces:`);
        workspaces.forEach(ws => {
            console.log(`- Name: ${ws.name}, ID: ${ws.id}, Code: ${ws.firmCode}`);
        });
    } catch (error) {
        console.error("Error fetching workspaces:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
