
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const workspaces = await prisma.workspace.findMany({
        where: {
            OR: [
                { slug: 'ascolp' },
                { name: 'ascolp' } // checking both just in case
            ]
        },
        include: {
            briefs: true
        }
    });

    if (workspaces.length === 0) {
        console.log('No workspace found for "ascolp"');
        return;
    }

    for (const w of workspaces) {
        console.log(`Workspace: ${w.name} (Slug: ${w.slug}, ID: ${w.id})`);
        console.log(`Briefs count: ${w.briefs.length}`);
        w.briefs.forEach(b => {
            console.log(` - [${b.id}] ${b.title} (Status: ${b.status}) Created: ${b.createdAt}`);
        });
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
