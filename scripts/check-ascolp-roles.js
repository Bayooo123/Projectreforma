const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const workspaces = await prisma.workspace.findMany({
        where: { name: { contains: 'ascolp', mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
    });
    console.log('Workspaces:', workspaces);

    if (!workspaces.length) {
        console.log('No ASCOLP workspace found. Listing all workspaces...');
        const all = await prisma.workspace.findMany({ select: { id: true, name: true, slug: true } });
        console.log(all);
        return;
    }

    for (const ws of workspaces) {
        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: ws.id, status: 'active' },
            select: { role: true, user: { select: { name: true, email: true } } },
            orderBy: { user: { name: 'asc' } },
        });
        console.log(`\n=== ${ws.name} (${ws.slug}) ===`);
        members.forEach(m => console.log(`  ${(m.user.name || '').padEnd(25)} ${m.user.email.padEnd(40)} role: ${m.role || '(none)'}`));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
