
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMetadata() {
    console.log('🔄 Starting Matter Metadata Repair...\n');

    try {
        // 1. Fetch all litigation-derived matters with their related data
        const matters = await prisma.matter.findMany({
            include: {
                client: true,
                briefs: true,
                lawyers: {
                    where: { isAppearing: true },
                    include: { lawyer: true }
                },
                courtDates: {
                    include: { appearances: true },
                    orderBy: { date: 'desc' }
                }
            }
        });

        console.log(`📋 Processing ${matters.length} matters...\n`);

        let titlesUpdated = 0;
        let lawyersUpdated = 0;

        for (const matter of matters) {
            const updates: any = {};
            let shouldUpdate = false;

            // --- A. Identify Opponent and Fix Title ---
            // Pattern: "Client v Opposing Party" or "X v Opposing Party"
            if (matter.name.includes('Opposing Party')) {
                const clientName = matter.client?.name || 'Client';

                // If the name is literally "Client v Opposing Party", we can't do much without user input
                // but we can at least ensure structured fields are set if we find clues in proceedings.
                // For now, we'll mark it for manual update by keeping the name but offering a better structure.

                // Heuristic: Try to find opponent name in court proceedings
                let foundOpponent = null;
                for (const cd of matter.courtDates) {
                    if (cd.proceedings?.includes('v.')) {
                        const parts = cd.proceedings.split('v.');
                        if (parts.length > 1) {
                            foundOpponent = parts[1].split('.')[0].trim();
                            break;
                        }
                    }
                }

                if (foundOpponent) {
                    updates.opponentName = foundOpponent;
                    updates.name = `${clientName} v ${foundOpponent}`;
                    shouldUpdate = true;
                    titlesUpdated++;
                    console.log(`✨ Updated title: "${matter.name}" -> "${updates.name}"`);
                }
            }

            // --- B. Fix Lawyer in Charge ---
            // Ensure lawyerInChargeId is set based on appearances or associations
            if (!matter.lawyerInChargeId) {
                const appearingLawyer = matter.lawyers[0]?.lawyerId ||
                    matter.courtDates[0]?.appearances[0]?.id;

                if (appearingLawyer) {
                    updates.lawyerInChargeId = appearingLawyer;
                    shouldUpdate = true;
                    lawyersUpdated++;
                    console.log(`👤 Assigned Lawyer in Charge for "${matter.name}": ${appearingLawyer}`);
                }
            }

            if (shouldUpdate) {
                await prisma.matter.update({
                    where: { id: matter.id },
                    data: updates
                });

                // Sync the linked Briefs as well
                if (matter.briefs.length > 0) {
                    for (const brief of matter.briefs) {
                        await prisma.brief.update({
                            where: { id: brief.id },
                            data: {
                                name: updates.name || brief.name,
                                lawyerInChargeId: updates.lawyerInChargeId || brief.lawyerInChargeId
                            }
                        });
                    }
                }
            }
        }

        console.log('\n✅ Repair Complete!');
        console.log(`  - Titles updated: ${titlesUpdated}`);
        console.log(`  - Lawyers assigned: ${lawyersUpdated}`);

    } catch (error) {
        console.error('❌ Repair failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixMetadata();
