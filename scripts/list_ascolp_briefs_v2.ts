
import { PrismaClient } from '@prisma/client';

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

    console.log(`Workspace: ${workspace.name}`);
    console.log(`Briefs count: ${workspace.briefs.length}`);
    workspace.briefs.forEach(b => {
        console.log(`- [${b.id}] Num: ${b.briefNumber}, Name: "${b.name}", Status: ${b.status}, Created: ${b.createdAt.toISOString()}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
