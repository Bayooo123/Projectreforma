const { updateWorkspaceSettings, getWorkspaceSettings } = require('./src/app/actions/settings');
const { prisma } = require('./src/lib/prisma');

// Mock next/cache since we can't run server actions directly in node script easily 
// unless we use ts-node and handle imports correctly.
// Actually, running server actions in a standalone script is hard because of 'use server' and Next.js context.
// Better to verify via Prisma directly or just trust the manual verification in the walkthrough.

// Instead, let's just use Prisma directly to verify the schema allows writing to letterheadUrl.
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    try {
        const workspace = await db.workspace.findFirst();
        if (!workspace) {
            console.log('No workspace found to test.');
            return;
        }

        console.log('Testing letterheadUrl update on workspace:', workspace.id);
        const testUrl = 'https://example.com/test-letterhead.png';

        const updated = await db.workspace.update({
            where: { id: workspace.id },
            data: { letterheadUrl: testUrl }
        });

        if (updated.letterheadUrl === testUrl) {
            console.log('✅ Success: letterheadUrl updated.');
            // Revert
            await db.workspace.update({
                where: { id: workspace.id },
                data: { letterheadUrl: workspace.letterheadUrl } // existing was likely null, but let's just keep it safe or set null
            });
        } else {
            console.error('❌ Failed to update letterheadUrl');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await db.$disconnect();
    }
}

main();
