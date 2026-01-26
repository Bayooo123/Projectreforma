const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    const email = 'bayo@abiolasanniandco.com';
    const newPassword = 'worldwideweb123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log(`Searching for user: ${email}...`);
    const user = await prisma.user.findUnique({
        where: { email: email }
    });

    if (user) {
        console.log(`User found: ${user.name}`);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        console.log(`✅ Password for "${user.email}" has been reset to: ${newPassword}`);
    } else {
        console.error(`❌ User with email "${email}" not found in the database.`);
        console.log('Listing all users to help debug...');
        const allUsers = await prisma.user.findMany({
            select: { email: true, name: true }
        });
        console.table(allUsers);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
