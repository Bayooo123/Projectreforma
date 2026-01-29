import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixJosephineEmail() {
    console.log('🔧 Fixing Josephine Ogbinaka email mapping...\n');

    const oldEmail = 'Riwo@abiolasanniandco.com';
    const newEmail = 'riwo@abiolasanniandco.com';

    try {
        // 1. Update User record
        const userUpdate = await prisma.user.updateMany({
            where: { email: oldEmail },
            data: { email: newEmail }
        });
        console.log(`✅ Updated ${userUpdate.count} user record(s)`);

        // 2. Find all MatterLawyer associations with the old email
        const user = await prisma.user.findUnique({
            where: { email: newEmail }
        });

        if (user) {
            console.log(`✅ Found user: ${user.name} (${user.email})`);
        }

        console.log('\n✨ Email fix completed successfully!');
    } catch (error) {
        console.error('❌ Error fixing email:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

fixJosephineEmail();
