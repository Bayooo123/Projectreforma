const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditIntegrity() {
    console.log('🔍 Starting Database Integrity Audit...');

    try {
        // 1. Count Records
        const briefCount = await prisma.brief.count();
        const clientCount = await prisma.client.count();
        const lawyerCount = await prisma.user.count(); // Assuming lawyers are Users
        const documentCount = await prisma.document.count();

        console.log(`\n📊 Record Counts:`);
        console.log(`- Briefs: ${briefCount}`);
        console.log(`- Clients: ${clientCount}`);
        console.log(`- Users (Lawyers): ${lawyerCount}`);
        console.log(`- Documents: ${documentCount}`);

        // 2. Check for Inactive Briefs (Soft Deleted)
        const inactiveBriefs = await prisma.brief.count({
            where: { status: 'inactive' }
        });
        console.log(`\n🗑️ Trash Analysis:`);
        console.log(`- Inactive Briefs: ${inactiveBriefs}`);

        // 3. Check for Documents linked to Inactive Briefs
        // These are candidates for permanent deletion
        const documentsInTrash = await prisma.document.count({
            where: {
                brief: {
                    status: 'inactive'
                }
            }
        });
        console.log(`- Documents in Trash (linked to inactive briefs): ${documentsInTrash}`);

        // 4. Verify Foreign Key Constraints (Sample Check)
        // Fetch 5 random briefs and ensure their client/lawyer exists
        const sampleBriefs = await prisma.brief.findMany({
            take: 5,
            include: { client: true, lawyer: true }
        });

        console.log(`\n✅ Sample Integrity Check (5 Briefs):`);
        sampleBriefs.forEach(b => {
            const clientStatus = b.client ? '✅' : '❌ MISSING';
            const lawyerStatus = b.lawyer ? '✅' : '❌ MISSING';
            console.log(`- Brief ${b.briefNumber}: Client ${clientStatus}, Lawyer ${lawyerStatus}`);
        });

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

auditIntegrity();
