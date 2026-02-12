/**
 * Migration Script: Brief Metadata Reconciliation
 * 
 * This script migrates existing briefs to the new architectural model:
 * 1. Marks litigation-derived briefs (those linked to matters)
 * 2. Populates lawyer in charge from court appearance data
 * 3. Creates audit trail entries for initial assignments
 * 4. Validates data integrity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateBriefs() {
    console.log('🔄 Starting Brief Metadata Migration...\n');

    try {
        // Fetch all briefs with their related data
        const briefs = await prisma.brief.findMany({
            include: {
                matter: {
                    include: {
                        courtDates: {
                            include: { appearances: true },
                            orderBy: { date: 'asc' },
                            take: 1 // Get first court appearance
                        }
                    }
                }
            }
        });

        console.log(`📋 Found ${briefs.length} briefs to process\n`);

        let litigationDerivedCount = 0;
        let standaloneCount = 0;
        let lawyerAssignedCount = 0;
        let auditEntriesCreated = 0;

        for (const brief of briefs) {
            const updates: any = {};
            let shouldUpdate = false;

            // 1. Mark litigation-derived briefs
            if (brief.matterId && !brief.isLitigationDerived) {
                updates.isLitigationDerived = true;
                shouldUpdate = true;
                litigationDerivedCount++;

                console.log(`✓ Brief ${brief.briefNumber}: Marked as litigation-derived`);

                // 2. Set lawyer in charge from first appearance
                const firstAppearance = brief.matter?.courtDates[0];
                if (firstAppearance?.appearances?.length > 0 && !brief.lawyerInChargeId) {
                    const appearingLawyer = firstAppearance.appearances[0];
                    updates.lawyerInChargeId = appearingLawyer.id;
                    lawyerAssignedCount++;

                    console.log(`  → Assigned lawyer in charge: ${appearingLawyer.name || appearingLawyer.email}`);

                    // Create audit entry
                    try {
                        await prisma.briefLawyerHistory.create({
                            data: {
                                briefId: brief.id,
                                previousLawyerId: null,
                                newLawyerId: appearingLawyer.id,
                                changedBy: brief.lawyerId, // Use brief creator as the one who "changed" it
                                reason: 'Migration: Populated from court appearance data',
                            }
                        });
                        auditEntriesCreated++;
                    } catch (error) {
                        console.error(`  ⚠️  Failed to create audit entry: ${error}`);
                    }
                } else if (!brief.lawyerInChargeId) {
                    // No appearance data, default to brief creator
                    updates.lawyerInChargeId = brief.lawyerId;
                    console.log(`  → Defaulted lawyer in charge to brief creator`);
                }
            } else if (!brief.matterId && !brief.isLitigationDerived) {
                // Mark as standalone
                updates.isLitigationDerived = false;
                shouldUpdate = true;
                standaloneCount++;

                // Ensure lawyer in charge is set
                if (!brief.lawyerInChargeId) {
                    updates.lawyerInChargeId = brief.lawyerId;
                }

                console.log(`✓ Brief ${brief.briefNumber}: Marked as standalone`);
            }

            // Apply updates
            if (shouldUpdate) {
                await prisma.brief.update({
                    where: { id: brief.id },
                    data: updates
                });
            }
        }

        console.log('\n✅ Migration Complete!\n');
        console.log('Summary:');
        console.log(`  - Litigation-derived briefs: ${litigationDerivedCount}`);
        console.log(`  - Standalone briefs: ${standaloneCount}`);
        console.log(`  - Lawyers assigned: ${lawyerAssignedCount}`);
        console.log(`  - Audit entries created: ${auditEntriesCreated}`);

        // Validation
        console.log('\n🔍 Running validation checks...\n');

        const briefsWithoutLawyerInCharge = await prisma.brief.count({
            where: { lawyerInChargeId: null }
        });

        if (briefsWithoutLawyerInCharge > 0) {
            console.warn(`⚠️  Warning: ${briefsWithoutLawyerInCharge} briefs still have no lawyer in charge`);
        } else {
            console.log('✓ All briefs have a lawyer in charge assigned');
        }

        const litigationBriefsCount = await prisma.brief.count({
            where: { isLitigationDerived: true }
        });

        console.log(`✓ ${litigationBriefsCount} litigation-derived briefs`);

        const standaloneBriefsCount = await prisma.brief.count({
            where: { isLitigationDerived: false }
        });

        console.log(`✓ ${standaloneBriefsCount} standalone briefs`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
migrateBriefs()
    .then(() => {
        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed with error:', error);
        process.exit(1);
    });
