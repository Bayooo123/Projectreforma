
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const term = "ASCOLP";
    console.log(`Searching for "${term}"...`);

    const workspaceByName = await prisma.workspace.findFirst({
        where: { name: { contains: term, mode: 'insensitive' } }
    });
    if (workspaceByName) console.log("Found Workspace by name:", workspaceByName);

    const workspaceByCode = await prisma.workspace.findFirst({
        where: { firmCode: { contains: term, mode: 'insensitive' } }
    });
    if (workspaceByCode) console.log("Found Workspace by firmCode:", workspaceByCode);

    const userByName = await prisma.user.findFirst({
        where: { name: { contains: term, mode: 'insensitive' } }
    });
    if (userByName) console.log("Found User by name:", userByName);

    const userByEmail = await prisma.user.findFirst({
        where: { email: { contains: term, mode: 'insensitive' } }
    });
    if (userByEmail) console.log("Found User by email:", userByEmail);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
