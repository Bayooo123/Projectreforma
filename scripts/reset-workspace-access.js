
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const firmCode = "001_2025";
    const newPassword = "reforma123";

    console.log(`Resetting password for Workspace with Firm Code: ${firmCode}`);

    const workspace = await prisma.workspace.findUnique({
        where: { firmCode: firmCode }
    });

    if (!workspace) {
        console.error(`Workspace with firm code ${firmCode} not found.`);
        return;
    }

    console.log(`Found Workspace: ${workspace.name} (${workspace.id})`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedWorkspace = await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
            joinPassword: hashedPassword
        }
    });

    console.log("Successfully updated workspace credentials.");
    console.log("==========================================");
    console.log(`Firm Code:    ${updatedWorkspace.firmCode}`);
    console.log(`New Password: ${newPassword}`);
    console.log("==========================================");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
