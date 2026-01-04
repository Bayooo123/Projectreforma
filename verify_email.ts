
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSTIC CHECK ---');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 1. Check for ANY recent task
    const recentTasks = await prisma.task.findMany({
        where: { createdAt: { gte: oneHourAgo } },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log(`\nTasks found (last 1h): ${recentTasks.length}`);
    recentTasks.forEach(t => {
        console.log(` - [${t.createdAt.toISOString()}] Source: ${t.source} | Title: ${t.title}`);
    });

    // 2. Check for ANY brief log
    const recentActivity = await prisma.briefActivityLog.findMany({
        where: { timestamp: { gte: oneHourAgo } },
        orderBy: { timestamp: 'desc' },
        take: 5
    });

    console.log(`\nBrief Logs found (last 1h): ${recentActivity.length}`);
    recentActivity.forEach(a => {
        console.log(` - [${a.timestamp.toISOString()}] Type: ${a.activityType} | Desc: ${a.description}`);
    });

    console.log('\n--- END DIAGNOSTIC ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
