
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const workspaces = await prisma.workspace.findMany();
    console.log("Existing Workspaces:");
    workspaces.forEach(ws => {
        console.log(`- Name: ${ws.name}, ID: ${ws.id}, Slug: ${ws.slug}, FirmCode: ${ws.firmCode}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
