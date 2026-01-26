const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    const email = 'bayo@abiolasanniandco.com';
    const name = 'Adebayo Gbadebo';
    const password = 'worldwideweb123';
    const workspaceName = 'ASCOLP';

    // 1. Find Workspace
    const workspace = await prisma.workspace.findFirst({
        where: { name: { contains: workspaceName, mode: 'insensitive' } }
    });

    if (!workspace) {
        console.error(`❌ Workspace "${workspaceName}" not found.`);
        return;
    }
    console.log(`✅ Found Workspace: ${workspace.name} (ID: ${workspace.id})`);

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Upsert User
    const user = await prisma.user.upsert({
        where: { email: email },
        update: {
            password: hashedPassword,
            name: name
        },
        create: {
            email: email,
            name: name,
            password: hashedPassword
        }
    });

    console.log(`✅ User Upserted: ${user.email} (ID: ${user.id})`);

    // 4. Create Workspace Member (Explicit Relation)
    try {
        const member = await prisma.workspaceMember.upsert({
            where: {
                workspaceId_userId: {
                    workspaceId: workspace.id,
                    userId: user.id
                }
            },
            update: {
                role: 'admin', // Make them admin just in case
                status: 'active'
            },
            create: {
                workspaceId: workspace.id,
                userId: user.id,
                role: 'admin',
                status: 'active'
            }
        });
        console.log(`✅ Linked to Workspace as Admin (Member ID: ${member.id})`);
    } catch (e) {
        console.error('⚠️ Error linking to workspace:', e.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
