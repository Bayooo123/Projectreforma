
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugBriefDetail() {
    console.log('🔍 DEBUGGING BRIEF DETAIL...');

    try {
        // 1. Get a valid brief ID from the DB
        const brief = await prisma.brief.findFirst();
        if (!brief) {
            console.log('❌ No briefs found in DB to test with.');
            return;
        }
        console.log(`✅ Found brief: ${brief.id} (${brief.briefNumber})`);

        // 2. Simulate getBriefById
        console.log('\n2️⃣ Simulating getBriefById...');
        try {
            const result = await prisma.brief.findUnique({
                where: { id: brief.id },
                include: {
                    client: true,
                    lawyer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    matter: true, // Suspect this might be the issue if table missing
                    documents: true,
                    workspace: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            if (result) {
                console.log('✅ getBriefById SUCCESS!');
                console.log('   Matter:', result.matter);
                console.log('   Documents:', result.documents.length);
            } else {
                console.log('❌ getBriefById returned NULL (unexpected for existing ID)');
            }

        } catch (error) {
            console.error('❌ getBriefById FAILED:', error);
            if (error.code === 'P2021') {
                console.log('   👉 CAUSE: Missing Table!', error.meta);
            }
        }

    } catch (error) {
        console.error('🔥 ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugBriefDetail();
