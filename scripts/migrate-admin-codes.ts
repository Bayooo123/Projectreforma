
import { PrismaClient } from '@prisma/client';
import { DEFAULT_ADMIN_PIN_HASH } from '../src/lib/rbac';

const prisma = new PrismaClient();

async function main() {
    console.log('🔐 Starting Admin Code Migration...');

    // Find all workspaces without an admin code
    const workspaces = await prisma.workspace.findMany({
        where: {
            adminCode: null
        }
    });

    console.log(`Found ${workspaces.length} workspaces requiring admin code update.`);

    let updatedCount = 0;

    for (const ws of workspaces) {
        try {
            await prisma.workspace.update({
                where: { id: ws.id },
                data: {
                    adminCode: DEFAULT_ADMIN_PIN_HASH
                }
            });
            updatedCount++;
            process.stdout.write(`\rProgress: ${updatedCount}/${workspaces.length}`);
        } catch (error) {
            console.error(`\nFailed to update workspace ${ws.id}:`, error);
        }
    }

    console.log(`\n\n✅ Migration Complete. Updated ${updatedCount} workspace(s).`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
