import { prisma } from './src/lib/prisma.js';

async function quickTest() {
    console.log('Testing database connection...\n');

    try {
        // Test connection
        await prisma.$connect();
        console.log('✅ Connected to database\n');

        // Count briefs
        const count = await prisma.brief.count();
        console.log(`Total briefs in database: ${count}\n`);

        // Get all briefs
        if (count > 0) {
            const briefs = await prisma.brief.findMany({
                select: {
                    id: true,
                    briefNumber: true,
                    name: true,
                    workspaceId: true,
                    createdAt: true,
                }
            });

            console.log('Briefs:');
            briefs.forEach(b => {
                console.log(`- ${b.briefNumber}: ${b.name} (Workspace: ${b.workspaceId})`);
            });
        } else {
            console.log('❌ NO BRIEFS FOUND IN DATABASE');
            console.log('This means briefs are NOT being saved!\n');
        }

        // Check workspaces
        const workspaces = await prisma.workspace.findMany({
            select: {
                id: true,
                name: true,
            }
        });

        console.log('\nWorkspaces:');
        workspaces.forEach(w => {
            console.log(`- ${w.name} (ID: ${w.id})`);
        });

    } catch (error) {
        console.error('❌ ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

quickTest();
