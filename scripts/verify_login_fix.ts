
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function mockLogin(emailInput: string) {
    console.log(`\nAttempting login with: '${emailInput}'`);

    // Simulate the logic in src/auth.ts
    const email = emailInput.toLowerCase();
    console.log(`Normalized email to: '${email}'`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { workspaces: true }
    });

    if (!user) {
        console.log('❌ User not found.');
        return;
    }

    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);

    // Check workspace membership
    const workspaceId = 'cmj8ef2zk000336gj8j606v5y'; // ASCOLP guess or fetch
    // Actually let's just keys off the first workspace
    if (user.workspaces.length > 0) {
        console.log(`User has ${user.workspaces.length} workspace memberships.`);
        user.workspaces.forEach(ws => {
            console.log(`- Workspace: ${ws.workspaceId}, Role: ${ws.role}`);
        });
    } else {
        console.log('⚠️ User has NO workspace memberships.');
    }
}

async function main() {
    await mockLogin('Bayo@abiolasanniandco.com'); // Mixed case
    await mockLogin('bayo@abiolasanniandco.com'); // Lower case
}

main().finally(() => prisma.$disconnect());
