import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyLoginSimulation() {
    const email = 'bayo@abiolasanniandco.com';
    const password = 'password12345';

    console.log(`🔍 Simulating login for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { workspaces: { include: { workspace: true } } }
    });

    if (!user) {
        console.error('❌ User not found');
        return;
    }

    const pwMatch = await bcrypt.compare(password, user.password || '');
    console.log(`🔑 Password Match: ${pwMatch}`);

    if (user.workspaces.length > 0) {
        const ws = user.workspaces[0].workspace;
        console.log(`🏢 Primary Workspace: ${ws.name} (Slug: ${ws.slug})`);
    } else {
        console.error('❌ User has no workspaces');
    }
}

verifyLoginSimulation().finally(() => prisma.$disconnect());
