
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getMagicLink() {
    try {
        const ws = await prisma.workspace.findFirst({
            where: { name: 'abiolasanniandco' }
        });

        if (ws && ws.inviteLinkToken) {
            console.log(`MAGIC_LINK_TOKEN:${ws.inviteLinkToken}`);
            console.log(`FULL_URL:https://reforma.app/join/${ws.inviteLinkToken}`);
        } else {
            console.log("No token found for abiolasanniandco");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

getMagicLink();
