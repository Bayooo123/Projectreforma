
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'bayo@abiolasanniandco.com';
    const newPassword = 'Ascolp#2026';

    console.log(`Resetting password for user: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.error('❌ User not found!');
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        console.log(`✅ Successfully updated password for ${user.name} (${user.email}) to '${newPassword}'`);

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
