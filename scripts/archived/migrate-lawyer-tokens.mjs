import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('🚀 Starting Lawyer Token Migration (Raw SQL)...');

    // Get users without tokens
    const users = await prisma.$queryRaw`SELECT id, email FROM "User" WHERE "lawyerToken" IS NULL`;

    // @ts-ignore
    console.log(`Found ${users.length} users needing tokens.`);

    // @ts-ignore
    for (const user of users) {
        let unique = false;
        let token = '';

        while (!unique) {
            token = Math.floor(1000 + Math.random() * 9000).toString();
            // Check uniqueness using raw query to be safe
            const exists = await prisma.$queryRaw`SELECT id FROM "User" WHERE "lawyerToken" = ${token}`;
            // @ts-ignore
            if (exists.length === 0) unique = true;
        }

        // Update using raw query
        await prisma.$executeRaw`UPDATE "User" SET "lawyerToken" = ${token} WHERE id = ${user.id}`;

        console.log(`✅ Assigned ${token} to ${user.email}`);
    }

    console.log('🎉 Migration complete!');
}

migrate()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
