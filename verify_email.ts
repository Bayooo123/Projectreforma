
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const taskCount = await prisma.task.count({
        where: {
            createdAt: { gte: oneHourAgo },
            source: 'email'
        }
    });

    const briefLogCount = await prisma.briefActivityLog.count({
        where: {
            timestamp: { gte: oneHourAgo },
            activityType: 'email_received'
        }
    });

    console.log('--- RESULTS ---');
    console.log(`Recent Email Tasks: ${taskCount}`);
    console.log(`Recent Brief Logs: ${briefLogCount}`);
    console.log('--- END ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
