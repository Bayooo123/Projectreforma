
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const oldEmail = 'henrietta@abiolasanniandco.com';
    const newEmail = 'info@abiolasanniandco.com';

    try {
        // 1. Check if the target email already exists
        const targetUser = await prisma.user.findUnique({
            where: { email: newEmail }
        });

        if (targetUser) {
            console.log(`User with email ${newEmail} already exists!`);
            console.log(`ID: ${targetUser.id}, Name: ${targetUser.name}`);
            console.log('Cannot simply rename. Please advise if we should merge or delete.');
            return;
        }

        // 2. Find the current user
        const currentUser = await prisma.user.findUnique({
            where: { email: oldEmail }
        });

        if (!currentUser) {
            console.log(`User with email ${oldEmail} not found.`);
            return;
        }

        // 3. Update the email
        const updatedUser = await prisma.user.update({
            where: { id: currentUser.id },
            data: { email: newEmail }
        });

        console.log(`Successfully updated email for ${updatedUser.name} to ${updatedUser.email}`);

    } catch (error) {
        console.error('Error updating email:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
