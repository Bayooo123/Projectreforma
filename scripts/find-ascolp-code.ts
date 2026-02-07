import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const workspace = await prisma.workspace.findFirst({
        where: {
            name: {
                contains: 'ASCOLP',
                mode: 'insensitive'
            }
        }
    });

    if (workspace) {
        console.log('Found Workspace:', JSON.stringify(workspace, null, 2));
    } else {
        console.log('ASCOLP workspace not found.');
        // List all just in case
        const all = await prisma.workspace.findMany();
        console.log('All Workspaces:', all.map(w => ({ name: w.name, slug: w.slug, joinCode: (w as any).joinCode || (w as any).code })));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
