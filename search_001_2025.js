const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const searchTerm = '001_2025';
    console.log(`Searching for "${searchTerm}"...`);

    try {
        // 1. Check Workspaces
        const workspace = await prisma.workspace.findFirst({
            where: {
                OR: [
                    { slug: { contains: searchTerm, mode: 'insensitive' } },
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { firmCode: { contains: searchTerm, mode: 'insensitive' } }
                ]
            },
            include: { briefs: true }
        });
        if (workspace) console.log('Found ID in Workspace:', workspace.name, `(${workspace.briefs.length} briefs)`);

        // 2. Check Matters
        const matter = await prisma.matter.findFirst({
            where: {
                OR: [
                    { caseNumber: { contains: searchTerm, mode: 'insensitive' } },
                    { name: { contains: searchTerm, mode: 'insensitive' } }
                ]
            },
            include: { briefs: true }
        });
        if (matter) console.log('Found ID in Matter:', matter.name, `(${matter.briefs.length} briefs)`);

        // 3. Check Briefs directly
        const briefs = await prisma.brief.findMany({
            where: {
                OR: [
                    { briefNumber: { contains: searchTerm, mode: 'insensitive' } },
                    { name: { contains: searchTerm, mode: 'insensitive' } }
                ]
            }
        });
        if (briefs.length > 0) console.log(`Found ${briefs.length} Briefs matching name/number:`, briefs.map(b => b.briefNumber));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
