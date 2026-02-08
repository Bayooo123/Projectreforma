
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countEverything() {
    try {
        const counts = {};
        const tables = [
            'Workspace', 'User', 'WorkspaceMember', 'Matter', 'CourtDate', 'Brief', 'Client',
            'ComplianceObligation', 'ComplianceTask', 'Task', 'Notification'
        ];

        for (const model of tables) {
            try {
                const lowerModel = model.charAt(0).toLowerCase() + model.slice(1);
                if (prisma[lowerModel]) {
                    counts[model] = await prisma[lowerModel].count();
                } else {
                    counts[model] = 'Model not in PrismaClient';
                }
            } catch (e) {
                counts[model] = `Error: ${e.message}`;
            }
        }

        console.log('--- TABLE COUNTS ---');
        console.table(counts);

        // Also check for any users created TODAY or YESTERDAY
        const recentUsers = await prisma.user.findMany({
            where: {
                createdAt: { gte: new Date('2026-02-07T00:00:00Z') }
            },
            select: { email: true, createdAt: true }
        });
        console.log('\n--- RECENT USERS ---');
        console.log(recentUsers);

    } catch (e) {
        console.error('GLOBAL ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

countEverything();
