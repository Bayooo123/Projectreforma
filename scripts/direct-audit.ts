import { PrismaClient } from '@prisma/client';

async function main() {
    const directUrl = process.env.DIRECT_URL;
    console.log('Using DIRECT_URL:', directUrl);

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: directUrl
            }
        }
    });

    try {
        const workspaces: any[] = await prisma.$queryRaw`SELECT id, name, slug, "createdAt" FROM "Workspace"`;
        console.log(`\nWorkspaces found: ${workspaces.length}`);
        workspaces.forEach(ws => {
            console.log(` - ID: ${ws.id} | Name: ${ws.name} | Slug: ${ws.slug} | Created: ${ws.createdAt}`);
        });

        const briefCount = await prisma.brief.count();
        console.log(`Brief Count: ${briefCount}`);
    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
