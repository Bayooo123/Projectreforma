
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugBriefs() {
    console.log('🔍 STARTING DEEP DIVE DEBUGGING...');

    try {
        // 1. Find the specific "invisible" brief
        const briefNumber = '123';
        console.log(`\n1️⃣ Searching for brief with number: "${briefNumber}"...`);
        const ghostBrief = await prisma.brief.findUnique({
            where: { briefNumber },
            include: { workspace: true, lawyer: true }
        });

        if (!ghostBrief) {
            console.log('❌ Brief 123 NOT FOUND in DB.');
            return;
        }

        console.log('✅ Brief 123 FOUND in DB!');
        console.log('   ID:', ghostBrief.id);
        console.log('   Workspace ID:', ghostBrief.workspaceId);
        console.log('   Workspace Name:', ghostBrief.workspace?.name);

        // 2. Simulate the EXACT query used by the UI
        console.log(`\n2️⃣ Simulating UI Query for Workspace: ${ghostBrief.workspaceId}`);
        try {
            const uiBriefs = await prisma.brief.findMany({
                where: {
                    workspaceId: ghostBrief.workspaceId,
                },
                include: {
                    client: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    lawyer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    documents: {
                        select: {
                            id: true,
                            name: true,
                            url: true,
                            type: true,
                            size: true,
                            uploadedAt: true,
                        },
                    },
                    _count: {
                        select: {
                            documents: true,
                        },
                    },
                },
                orderBy: {
                    updatedAt: 'desc',
                },
            });

            console.log(`   👉 Query returned ${uiBriefs.length} briefs.`);
            const foundInList = uiBriefs.find(b => b.id === ghostBrief.id);

            if (foundInList) {
                console.log('✅ The brief IS returned by the standard workspace query.');
                console.log('   Client:', foundInList.client ? 'Found' : 'MISSING');
                console.log('   Lawyer:', foundInList.lawyer ? 'Found' : 'MISSING');
            } else {
                console.log('❌ The brief is NOT returned by the standard workspace query.');
            }

        } catch (queryError) {
            console.error('❌ QUERY FAILED:', queryError);
        }

    } catch (error) {
        console.error('🔥 ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugBriefs();
