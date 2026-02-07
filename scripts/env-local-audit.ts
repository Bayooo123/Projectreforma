import { PrismaClient } from '@prisma/client';

async function main() {
    const url = "postgresql://postgres.veltyrhvxeiwbhptvczc:FRESHEXPERIENCES123%40@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
    console.log('Testing .env.local URL...');

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: url
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

        const firstBrief: any[] = await prisma.$queryRaw`SELECT * FROM "Brief" LIMIT 1`;
        if (firstBrief.length > 0) console.log('Sample Brief:', firstBrief[0]);

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
