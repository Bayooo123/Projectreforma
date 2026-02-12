
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
    console.log('🔍 Diagnosing Brief Data...\n');

    // 1. Analyze "Client v Opposing Party" naming
    const genericBriefs = await prisma.brief.findMany({
        where: {
            OR: [
                { name: { contains: 'Client' } },
                { name: { contains: 'Opposing Party' } }
            ],
            isLitigationDerived: true
        },
        take: 5,
        include: {
            matter: {
                include: {
                    client: true,
                    lawyers: { include: { lawyer: true } },
                    courtDates: { include: { appearances: true } }
                }
            },
            lawyerInCharge: true,
            lawyer: true
        }
    });

    console.log(`Found ${genericBriefs.length} sample briefs with generic names:\n`);

    for (const brief of genericBriefs) {
        console.log(`Brief: ${brief.name} (${brief.briefNumber})`);
        console.log(`  Source Matter: ${brief.matter?.name}`);
        console.log(`  Client: ${brief.matter?.client?.name}`);
        console.log(`  Lawyer in Charge: ${brief.lawyerInCharge?.name || 'None'}`);
        console.log(`  Creator: ${brief.lawyer?.name}`);
        console.log(`  Matter Lawyers: ${brief.matter?.lawyers.map(ml => `${ml.lawyer.name} (${ml.role}, Appearing: ${ml.isAppearing})`).join(', ')}`);
        console.log(`  Court Appearances: ${brief.matter?.courtDates.flatMap(cd => cd.appearances.map(a => a.name)).join(', ')}`);
        console.log('---');
    }

    // 2. Analyze Briefs assigned to "Adebayo Gbadebo" (assuming he is the user complaining)
    // We'll search by name if we can, or just list distribution
    const lawyers = await prisma.brief.groupBy({
        by: ['lawyerInChargeId'],
        _count: true
    });

    console.log('\nLawyer in Charge Distribution:');
    for (const group of lawyers) {
        const lawyer = group.lawyerInChargeId ? await prisma.user.findUnique({ where: { id: group.lawyerInChargeId } }) : null;
        console.log(`  ${lawyer?.name || 'Unassigned'}: ${group._count} briefs`);
    }
}

diagnose()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
