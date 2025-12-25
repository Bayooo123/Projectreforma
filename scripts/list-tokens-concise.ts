
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTokens() {
    const ws = await prisma.workspace.findMany();
    ws.forEach(w => {
        console.log(`${w.name}:::${w.inviteLinkToken}`);
    });
}

listTokens();
