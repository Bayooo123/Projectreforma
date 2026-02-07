
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('--- Comprehensive DB Audit ---');

        const workspaces = await prisma.workspace.findMany({
            include: {
                _count: {
                    select: {
                        briefs: true,
                        matters: true,
                        clients: true,
                        members: true
                    }
                }
            }
        });

        console.log('Workspaces Detail:');
        workspaces.forEach(ws => {
            console.log(`- ${ws.name} (${ws.id}, slug: ${ws.slug})`);
            console.log(`  Briefs: ${ws._count.briefs}`);
            console.log(`  Matters: ${ws._count.matters}`);
            console.log(`  Clients: ${ws._count.clients}`);
            console.log(`  Members: ${ws._count.members}`);
        });

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                workspaces: {
                    include: {
                        workspace: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        console.log('\nUsers and their Workspaces:');
        users.forEach(u => {
            const wsNames = u.workspaces.map(w => w.workspace.name).join(', ');
            console.log(`- ${u.email} (${u.name || 'No Name'}): [${wsNames}]`);
        });

        console.log('\nAll Briefs in DB:');
        const briefs = await prisma.brief.findMany({
            include: {
                workspace: { select: { name: true } }
            }
        });
        briefs.forEach(b => {
            console.log(`- ${b.name || b.title} (ID: ${b.id}, WS: ${b.workspace.name})`);
        });

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
