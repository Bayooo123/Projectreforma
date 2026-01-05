const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    const newPassword = 'worldwideweb123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 1. Reset Workspace Join Password
    console.log('Resetting ASCOLP Firm Password...');
    const workspace = await prisma.workspace.findFirst({
        where: { name: { contains: 'ASCOLP', mode: 'insensitive' } }
    });

    if (workspace) {
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: { joinPassword: hashedPassword }
        });
        console.log(`✅ Firm Password for "${workspace.name}" updated.`);
    } else {
        console.error('❌ ASCOLP workspace not found.');
    }

    // 2. Reset Owner Password (Professor Sanni)
    console.log('Resetting Owner Password...');
    const owner = await prisma.user.findFirst({
        where: { name: { contains: 'Abiola Sanni', mode: 'insensitive' } }
    });

    // Fallback if full name doesn't match, check by email domain owner
    // But earlier logs showed "Professor Abiola Sanni".

    if (owner) {
        await prisma.user.update({
            where: { id: owner.id },
            data: { password: hashedPassword }
        });
        console.log(`✅ User Password for "${owner.name}" (${owner.email}) updated.`);
    } else {
        console.error('❌ Owner "Abiola Sanni" not found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
