const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Searching for "Professor Sanni"...');
    const sanni = await prisma.user.findFirst({
        where: {
            name: {
                contains: 'Sanni',
                mode: 'insensitive'
            }
        },
        include: {
            workspaces: true
        }
    });

    if (sanni) {
        console.log('Found User:', sanni);
    } else {
        console.log('User "Professor Sanni" or similar not found.');
    }

    console.log('\nSearching for "ASCOLP" workspace...');
    const ascolp = await prisma.workspace.findFirst({
        where: {
            OR: [
                { name: { contains: 'ASCOLP', mode: 'insensitive' } },
                { firmCode: { contains: 'ASCOLP', mode: 'insensitive' } }
            ]
        }
    });

    if (ascolp) {
        console.log('Found Workspace:', ascolp);
    } else {
        console.log('Workspace "ASCOLP" not found.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
