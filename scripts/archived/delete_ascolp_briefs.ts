
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const briefIdsToDelete = [
    'cmjvjsm1l0004tkd1uq88gxin', // ARIK AIR
    'cmjn6u0w500043c2i1dppubsg' // Chief Daramola
];

async function main() {
    console.log(`Starting deletion process for ${briefIdsToDelete.length} briefs...`);

    // First, check if briefs exist
    const existingBriefs = await prisma.brief.findMany({
        where: {
            id: { in: briefIdsToDelete }
        },
        select: { id: true, name: true }
    });

    if (existingBriefs.length === 0) {
        console.log('No briefs found to delete.');
        return;
    }

    console.log(`Found ${existingBriefs.length} briefs to delete:`);
    existingBriefs.forEach(b => console.log(`- ${b.name} (${b.id})`));

    // Perform deletion in a transaction to ensure atomicity
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Clean up potential orphan references (Tasks, Notifications)
            // Note: We're setting briefId to null for tasks and relatedBriefId for notifications
            // effectively unlinking them rather than deleting them, preserving history if needed.
            // Or we can delete them if cascading is expected but not set in schema.
            // Given user request "delete these briefs", unlinking seems safer for unrelated tasks.

            const updateTasks = await tx.task.updateMany({
                where: { briefId: { in: briefIdsToDelete } },
                data: { briefId: null }
            });
            console.log(`Unlinked ${updateTasks.count} tasks.`);

            const updateNotifications = await tx.notification.updateMany({
                where: { relatedBriefId: { in: briefIdsToDelete } },
                data: { relatedBriefId: null }
            });
            console.log(`Unlinked ${updateNotifications.count} notifications.`);

            // 2. Delete the briefs
            // Relations like Document, BriefActivityLog should cascade if defined in schema.
            // If schema says onDelete: Cascade, prisma handles it.
            // Let's rely on Prisma schema or explict deletes if needed.
            // Checking schema again:
            // Document: brief Brief @relation(..., onDelete: Cascade) -> should be fine
            // BriefActivityLog: brief Brief @relation(..., onDelete: Cascade) -> should be fine
            // But just in case, we'll let the error guide us if cascade fails.

            const deleteResult = await tx.brief.deleteMany({
                where: {
                    id: { in: briefIdsToDelete }
                }
            });

            return deleteResult;
        });

        console.log(`Successfully deleted ${result.count} briefs.`);

    } catch (error) {
        console.error('Error during deletion transaction:', error);
        // If error is about foreign key constraint, we might need manual cleanup of other relations
        if (error instanceof Error && error.message.includes('Foreign key constraint failed')) {
            console.log('Foreign key constraint failed. You might need to manually delete dependent records.');
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
