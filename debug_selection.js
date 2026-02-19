const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function debug() {
    const email = 'asanni@abiolasanniandco.com';
    const user = await prisma.user.findFirst({
        where: { email },
        include: {
            workspaces: {
                include: {
                    workspace: {
                        include: {
                            _count: {
                                select: { briefs: true, matters: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!user) {
        console.log("User not found:", email);
        return;
    }

    console.log("User found:", user.id);
    user.workspaces.forEach(m => {
        console.log(`- WS: ${m.workspace.name} [ID: ${m.workspace.id}]`);
        console.log(`  Briefs: ${m.workspace._count.briefs}`);
        console.log(`  Matters: ${m.workspace._count.matters}`);
        console.log(`  Role: ${m.role}`);
        console.log(`  OwnerID: ${m.workspace.ownerId}`);
    });

    // Simulate getPrimaryWorkspace logic
    const memberships = user.workspaces;
    const sorted = memberships.sort((a, b) => {
        const scoreA = (a.workspace._count.briefs || 0) + (a.workspace._count.matters || 0);
        const scoreB = (b.workspace._count.briefs || 0) + (b.workspace._count.matters || 0);

        if (scoreA === scoreB) {
            if (a.workspace.ownerId === user.id && b.workspace.ownerId !== user.id) return -1;
            if (b.workspace.ownerId === user.id && a.workspace.ownerId !== user.id) return 1;
            return 0;
        }

        return scoreB - scoreA;
    });

    if (sorted.length > 0) {
        console.log("Selected Primary:", sorted[0].workspace.name, "(id:", sorted[0].workspace.id, ")");
    } else {
        console.log("No primary found");
    }
}

debug().catch(console.error).finally(() => prisma.$disconnect());
