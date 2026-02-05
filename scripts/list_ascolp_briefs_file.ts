
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const workspaceId = 'cmjmowtqq0003hr4hg9xotwn4';
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
            briefs: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!workspace) {
        console.log('Workspace not found by ID!');
        return;
    }

    let output = `Workspace: ${workspace.name}\nBriefs count: ${workspace.briefs.length}\n`;
    workspace.briefs.forEach(b => {
        output += `- [${b.id}] Num: ${b.briefNumber}, Name: "${b.name}", Status: ${b.status}, Created: ${b.createdAt.toISOString()}\n`;
    });

    fs.writeFileSync('briefs.txt', output);
    console.log('Written to briefs.txt');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
