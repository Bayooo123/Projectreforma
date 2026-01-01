const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function deleteBrief() {
    try {
        console.log('--- Starting Deletion Script ---');

        // 1. Find Workspace
        const workspace = await prisma.workspace.findFirst({
            where: {
                name: { contains: 'ASCOLP', mode: 'insensitive' }
            }
        });

        if (!workspace) {
            console.log('Error: ASCOLP workspace not found');
            return;
        }

        console.log(`Found Workspace: ${workspace.name}`);

        // 2. Find Brief by Name
        // User provided: "Chevron Nigeria Limited v. Bayelsa State Inland Revenue Board"
        const targetNamePart = "Chevron";

        console.log(`Searching for brief containing "${targetNamePart}"...`);

        const brief = await prisma.brief.findFirst({
            where: {
                workspaceId: workspace.id,
                name: { contains: targetNamePart, mode: 'insensitive' }
            }
        });

        if (!brief) {
            console.log(`Error: No brief found containing "${targetNamePart}"`);

            // Debug: List all to see what IS there
            const allBriefs = await prisma.brief.findMany({
                where: { workspaceId: workspace.id },
                take: 10
            });
            console.log('Available Briefs:', allBriefs.map(b => b.name));
            return;
        }

        console.log(`Found Brief: "${brief.name}" (${brief.id})`);

        // Safety verification
        if (!brief.name.toLowerCase().includes('chevron')) {
            console.log('Safety Stop: Brief name mismatch.');
            return;
        }

        // 3. Delete Brief
        console.log('Deleting...');
        await prisma.brief.delete({
            where: { id: brief.id }
        });

        console.log('SUCCESS: Brief deleted successfully.');

    } catch (error) {
        console.error('Error executing script:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteBrief();
