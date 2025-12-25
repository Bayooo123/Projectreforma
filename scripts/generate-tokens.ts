
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function generateTokens() {
    try {
        const workspaces = await prisma.workspace.findMany({
            where: { inviteLinkToken: null }
        });

        console.log(`Found ${workspaces.length} workspaces without tokens.`);

        for (const ws of workspaces) {
            // Generate a random 12-char token (URL safe)
            const token = crypto.randomBytes(8).toString('hex');

            await prisma.workspace.update({
                where: { id: ws.id },
                data: { inviteLinkToken: token }
            });

            console.log(`Updated "${ws.name}" -> Token: ${token}`);
        }

        // Explicitly print token for abiolasanniandco
        const target = await prisma.workspace.findFirst({
            where: {
                OR: [
                    { name: 'abiolasanniandco' },
                    { firmCode: '001_A' }
                ]
            }
        });

        if (target) {
            console.log(`\n[TARGET] Workspace: ${target.name}`);
            console.log(`[TARGET] Magic Link Token: ${target.inviteLinkToken}`);
            console.log(`[TARGET] Link: /join/${target.inviteLinkToken}`);
        } else {
            console.log("Target workspace not found.");
        }

    } catch (error) {
        console.error('Error generating tokens:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateTokens();
