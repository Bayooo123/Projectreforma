
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

async function testConnection(name, url) {
    console.log(`Testing ${name}...`);
    const prisma = new PrismaClient({
        datasources: {
            db: { url }
        }
    });
    try {
        await prisma.$connect();
        const workspaceCount = await prisma.workspace.count();
        const userCount = await prisma.user.count();
        const briefCount = await prisma.brief.count();
        console.log(`${name} SUCCESS:`);
        console.log(`- Workspaces: ${workspaceCount}`);
        console.log(`- Users: ${userCount}`);
        console.log(`- Briefs: ${briefCount}`);

        const workspaces = await prisma.workspace.findMany({
            select: { name: true, slug: true }
        });
        console.log('Workspaces:', workspaces);

        return true;
    } catch (error) {
        console.error(`${name} FAILED:`, error.message);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

async function run() {
    const envUrl = process.env.DATABASE_URL;
    const localEnvUrl = "postgresql://postgres.veltyrhvxeiwbhptvczc:FRESHEXPERIENCES123%40@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

    await testConnection('.env DATABASE_URL', envUrl);
    console.log('\n-------------------\n');
    await testConnection('.env.local DATABASE_URL', localEnvUrl);
}

run();
