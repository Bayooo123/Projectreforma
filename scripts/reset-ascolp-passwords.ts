
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const PASSWORD = 'archtype123';
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    console.log('Starting reset process...');
    console.log(`Target password: ${PASSWORD}`);

    // 1. Find ASCOLP workspace
    const workspace = await prisma.workspace.findFirst({
        where: {
            OR: [
                { slug: { contains: 'ascolp', mode: 'insensitive' } },
                { name: { contains: 'ascolp', mode: 'insensitive' } }
            ]
        },
        include: {
            members: {
                include: {
                    user: true
                }
            }
        }
    });

    if (!workspace) {
        console.error('ASCOLP workspace not found!');
        return;
    }

    console.log(`Found workspace: ${workspace.name} (${workspace.id})`);

    // 2. Update Workspace joinPassword
    // Note: firm-auth.ts confirms workspace.joinPassword is also hashed with bcrypt
    await prisma.workspace.update({
        where: { id: workspace.id },
        data: { joinPassword: hashedPassword }
    });
    console.log('Updated workspace join password.');

    // 3. Update Josephine's Name
    const josephineEmail = 'riwo@abiolasanniandco.com';
    const josephine = await prisma.user.findUnique({ where: { email: josephineEmail } });

    if (josephine) {
        await prisma.user.update({
            where: { email: josephineEmail },
            data: { name: 'Josephine Ogbinaka' }
        });
        console.log(`Updated name for ${josephineEmail} to Josephine Ogbinaka`);
    } else {
        console.warn(`User ${josephineEmail} not found, skipping name update.`);
    }

    // 4. Update All Workspace Members' Passwords
    const userIds = workspace.members.map(m => m.userId);

    if (userIds.length > 0) {
        const result = await prisma.user.updateMany({
            where: {
                id: { in: userIds }
            },
            data: {
                password: hashedPassword
            }
        });
        console.log(`Updated passwords for ${result.count} users in the workspace.`);
    } else {
        console.log('No members found in workspace to update.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
