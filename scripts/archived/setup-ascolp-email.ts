import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const workspace = await prisma.workspace.findFirst({
        where: { name: { contains: 'ASCOLP', mode: 'insensitive' } },
        select: { id: true, name: true },
    });

    if (!workspace) {
        // Try by firmCode
        const byCode = await prisma.workspace.findFirst({
            where: { firmCode: { contains: 'ASCOLP', mode: 'insensitive' } },
            select: { id: true, name: true },
        });

        if (!byCode) {
            console.error('❌ ASCOLP workspace not found. Available workspaces:');
            const all = await prisma.workspace.findMany({ select: { id: true, name: true, firmCode: true } });
            console.table(all);
            return;
        }

        Object.assign(workspace ?? {}, byCode);
    }

    const target = workspace!;
    const emailAddress = 'ascolp@reforma.ng';

    const config = await prisma.workspaceEmailConfig.upsert({
        where:  { workspaceId: target.id },
        create: { workspaceId: target.id, emailAddress, isActive: true },
        update: { emailAddress, isActive: true },
    });

    console.log(`✅ Institutional memory email set:`);
    console.log(`   Workspace : ${target.name} (${target.id})`);
    console.log(`   Address   : ${config.emailAddress}`);
    console.log(`   Active    : ${config.isActive}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
