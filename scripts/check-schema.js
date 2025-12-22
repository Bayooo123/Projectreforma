
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking schema...");
    try {
        // Attempt to select the specific column that was reported missing
        const workspace = await prisma.workspace.findFirst({
            select: {
                id: true,
                revenuePin: true
            }
        });
        console.log("Success! Query executed without error.");
        console.log("Workspace found:", workspace);
    } catch (error) {
        console.error("Error executing query:");
        console.error(error.message);
        process.exit(1);
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
