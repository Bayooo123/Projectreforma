// Database Connection Test Script
// Run this to verify Supabase connection and check if briefs are being saved

import { prisma } from './src/lib/prisma';

async function testDatabaseConnection() {
    console.log('========================================');
    console.log('DATABASE CONNECTION TEST');
    console.log('========================================\n');

    try {
        // Test connection
        console.log('1. Testing database connection...');
        await prisma.$connect();
        console.log('✅ Connected to database successfully\n');

        // Get database info
        console.log('2. Checking database info...');
        const result = await prisma.$queryRaw`SELECT current_database(), current_user;`;
        console.log('Database info:', result);
        console.log('');

        // Count total briefs
        console.log('3. Counting briefs in database...');
        const briefCount = await prisma.brief.count();
        console.log(`✅ Total briefs in database: ${briefCount}\n`);

        // Get recent briefs
        if (briefCount > 0) {
            console.log('4. Fetching recent briefs...');
            const recentBriefs = await prisma.brief.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    briefNumber: true,
                    name: true,
                    createdAt: true,
                    workspaceId: true,
                }
            });

            console.log('Recent briefs:');
            recentBriefs.forEach((brief, index) => {
                console.log(`  ${index + 1}. ${brief.briefNumber} - ${brief.name}`);
                console.log(`     ID: ${brief.id}`);
                console.log(`     Created: ${brief.createdAt}`);
                console.log(`     Workspace: ${brief.workspaceId}`);
                console.log('');
            });
        } else {
            console.log('⚠️  No briefs found in database');
            console.log('   This could mean:');
            console.log('   - Briefs are not being saved');
            console.log('   - Database is empty');
            console.log('   - Wrong database connection\n');
        }

        // Check workspaces
        console.log('5. Checking workspaces...');
        const workspaceCount = await prisma.workspace.count();
        console.log(`✅ Total workspaces: ${workspaceCount}\n`);

        if (workspaceCount > 0) {
            const workspaces = await prisma.workspace.findMany({
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            briefs: true,
                        }
                    }
                }
            });

            console.log('Workspaces:');
            workspaces.forEach((ws, index) => {
                console.log(`  ${index + 1}. ${ws.name} (ID: ${ws.id})`);
                console.log(`     Briefs: ${ws._count.briefs}`);
                console.log('');
            });
        }

        console.log('========================================');
        console.log('TEST COMPLETED SUCCESSFULLY');
        console.log('========================================');

    } catch (error) {
        console.error('❌ ERROR:', error);
        console.log('\nPossible issues:');
        console.log('1. DATABASE_URL not set in .env.local');
        console.log('2. Database credentials incorrect');
        console.log('3. Database not accessible');
        console.log('4. Prisma schema not synced with database');
    } finally {
        await prisma.$disconnect();
    }
}

testDatabaseConnection();
