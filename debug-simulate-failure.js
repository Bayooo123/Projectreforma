
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAllBriefs() {
    console.log('🔍 TESTING ALL BRIEFS...');

    try {
        // 1. Get all briefs
        const briefs = await prisma.brief.findMany();
        console.log(`Found ${briefs.length} briefs.`);

        for (const brief of briefs) {
            console.log(`\n👉 Testing Brief: ${brief.briefNumber} (${brief.id})`);

            try {
                const result = await prisma.brief.findUnique({
                    where: { id: brief.id },
                    include: {
                        client: true,
                        lawyer: { select: { id: true, name: true, email: true } },
                        matter: true,
                        documents: true,
                        workspace: { select: { id: true, name: true } },
                    },
                });

                if (result) {
                    console.log('   ✅ OK. Matter:', result.matter ? 'Found' : 'Null');
                } else {
                    console.log('   ❌ FAILED: Returned null');
                }
            } catch (error) {
                console.log('   🔥 CRASH:', error.message);
            }
        }

    } catch (error) {
        console.error('🔥 ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugAllBriefs();
