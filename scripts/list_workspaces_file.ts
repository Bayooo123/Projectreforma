
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const workspaces = await prisma.workspace.findMany({});

    let output = `Found ${workspaces.length} workspaces:\n`;
    for (const w of workspaces) {
        output += `- Name: "${w.name}", Slug: "${w.slug}", ID: ${w.id}\n`;
    }

    fs.writeFileSync('workspaces.txt', output);
    console.log('Written to workspaces.txt');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
