
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugWorkspaceOwnership() {
    console.log('🔍 CHECKING WORKSPACE OWNERSHIP...');

    try {
        // 1. Get all users
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true }
        });

        console.log(`\nFound ${users.length} users.`);

        for (const user of users) {
            console.log(`\n👤 User: ${user.email} (${user.id})`);

            // 2. Find owned workspaces
            const ownedWorkspaces = await prisma.workspace.findMany({
                where: { ownerId: user.id }
            });

            if (ownedWorkspaces.length > 0) {
                console.log(`   👑 Owns ${ownedWorkspaces.length} workspaces:`);
                ownedWorkspaces.forEach(w => {
                    console.log(`      - [${w.id}] ${w.name}`);
                });
            } else {
                console.log('   (No owned workspaces)');
            }

            // 3. Find memberships
            const memberships = await prisma.workspaceMember.findMany({
                where: { userId: user.id },
                include: { workspace: true }
            });

            if (memberships.length > 0) {
                console.log(`   👥 Member of ${memberships.length} workspaces:`);
                memberships.forEach(m => {
                    console.log(`      - [${m.workspace.id}] ${m.workspace.name} (Role: ${m.role})`);
                });
            }

            // 4. Simulate getPrimaryWorkspace logic
            const primaryOwned = await prisma.workspace.findFirst({
                where: { ownerId: user.id }
            });

            if (primaryOwned) {
                console.log(`   👉 getPrimaryWorkspace would return: [${primaryOwned.id}] ${primaryOwned.name} (Owned)`);
            } else if (memberships.length > 0) {
                // Sort by joinedAt desc as per logic
                const sorted = memberships.sort((a, b) => b.joinedAt - a.joinedAt);
                const first = sorted[0].workspace;
                console.log(`   👉 getPrimaryWorkspace would return: [${first.id}] ${first.name} (Member)`);
            } else {
                console.log('   👉 getPrimaryWorkspace would return: NULL');
            }
        }

    } catch (error) {
        console.error('🔥 ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugWorkspaceOwnership();
