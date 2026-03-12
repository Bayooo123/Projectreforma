const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    const email = 'bayo@abiolasanniandco.com';

    const before = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, isPlatformAdmin: true }
    });

    if (!before) {
        console.error(`❌ User not found: ${email}`);
        return;
    }

    console.log('Before:', before);

    if (before.isPlatformAdmin) {
        console.log('✅ Already a platform admin — no change needed.');
        return;
    }

    const updated = await prisma.user.update({
        where: { email },
        data: { isPlatformAdmin: true },
        select: { id: true, name: true, email: true, isPlatformAdmin: true }
    });

    console.log('✅ Updated:', updated);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
