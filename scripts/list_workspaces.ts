
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const workspaces = await prisma.workspace.findMany({});

    if (workspaces.length === 0) {
        console.log('No workspaces found at all.');
        return;
    }

    console.log(`Found ${workspaces.length} workspaces:`);
    for (const w of workspaces) {
        console.log(`- Name: "${w.name}", Slug: "${w.slug}", ID: ${w.id}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
