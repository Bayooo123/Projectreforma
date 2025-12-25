
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAscolpLink() {
    try {
        const ws = await prisma.workspace.findFirst({
            where: {
                OR: [
                    { name: { contains: 'ASCOLP', mode: 'insensitive' } },
                    { firmCode: '001_2025' }
                ]
            }
        });

        if (ws && ws.inviteLinkToken) {
            console.log(`WORKSPACE: ${ws.name}`);
            console.log(`MAGIC_LINK_TOKEN:${ws.inviteLinkToken}`);
            console.log(`FULL_URL:https://reforma.ng/join/${ws.inviteLinkToken}`);
        } else if (ws) {
            console.log(`Workspace found (${ws.name}) but no token.`);
        } else {
            console.log("No workspace found for ASCOLP or 001_2025");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

getAscolpLink();
