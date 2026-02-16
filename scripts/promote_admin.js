const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promote(email) {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { isPlatformAdmin: true }
        });
        console.log(`Successfully promoted ${email} to Platform Admin.`);
        console.log(user);
    } catch (error) {
        console.error(`Error promoting ${email}:`, error.message);
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Please provide an email address: node scripts/promote_admin.js user@example.com');
    process.exit(1);
}

promote(email);
