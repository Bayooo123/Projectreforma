import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateUniqueLawyerToken } from '../src/lib/lawyer-tokens';

const prisma = new PrismaClient();

async function main() {
    const DEFAULT_PASSWORD = 'password12345';
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    console.log('🚀 Starting ASCOLP Login Enablement...');

    // 1. Find ASCOLP Workspace using Raw SQL to be absolutely sure
    const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace" WHERE "name" ILIKE '%ASCOLP%' OR "slug" ILIKE '%ascolp%' LIMIT 1`;
    let workspaceBase = workspaces[0];

    if (!workspaceBase) {
        console.log('⚠️ ASCOLP not found via Raw SQL. Listing all available in DB:');
        const allWs: any = await prisma.$queryRaw`SELECT "id", "name", "slug" FROM "Workspace"`;
        allWs.forEach((w: any) => console.log(` - ${w.name} (Slug: ${w.slug}, ID: ${w.id})`));
        return;
    }

    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceBase.id },
        include: {
            members: {
                include: {
                    user: true
                }
            }
        }
    });

    if (!workspace) {
        console.error('❌ Could not fetch full workspace details.');
        return;
    }

    console.log(`📍 Found Workspace: ${workspace.name} (${workspace.id})`);
    console.log(`👥 Found ${workspace.members.length} members.`);

    for (const member of workspace.members) {
        const email = member.user.email;
        console.log(`处理ing User: ${email}...`);

        try {
            // Update User
            await prisma.user.update({
                where: { id: member.userId },
                data: {
                    password: hashedPassword,
                    emailVerified: new Date(), // Auto-verify
                }
            });

            // Ensure member is active
            await prisma.workspaceMember.update({
                where: {
                    workspaceId_userId: {
                        workspaceId: workspace.id,
                        userId: member.userId
                    }
                },
                data: { status: 'active' }
            });

            console.log(`   ✅ Enabled login for ${email}`);
        } catch (err: any) {
            console.error(`   ❌ Failed to update ${email}:`, err.message);
        }
    }

    // Also check if any users from firm-directory are missing
    const { ASCOLP_LAWYERS } = await import('../src/lib/firm-directory');
    console.log('\n🔍 Checking for missing users from firm-directory...');

    for (const lawyer of ASCOLP_LAWYERS) {
        const existing = workspace.members.find(m => m.user.email.toLowerCase() === lawyer.email.toLowerCase());

        if (!existing) {
            console.log(`➕ Adding missing lawyer: ${lawyer.email}...`);
            try {
                const lawyerToken = await generateUniqueLawyerToken();
                const newUser = await prisma.user.upsert({
                    where: { email: lawyer.email },
                    update: {
                        password: hashedPassword,
                        emailVerified: new Date(),
                    },
                    create: {
                        email: lawyer.email,
                        name: lawyer.name,
                        password: hashedPassword,
                        emailVerified: new Date(),
                        lawyerToken
                    }
                });

                await prisma.workspaceMember.upsert({
                    where: {
                        workspaceId_userId: {
                            workspaceId: workspace.id,
                            userId: newUser.id
                        }
                    },
                    update: { status: 'active' },
                    create: {
                        workspaceId: workspace.id,
                        userId: newUser.id,
                        role: lawyer.designation?.toLowerCase().includes('partner') ? 'partner' : 'associate',
                        status: 'active',
                        designation: lawyer.designation
                    }
                });
                console.log(`   ✅ Credated and linked: ${lawyer.email}`);
            } catch (err: any) {
                console.error(`   ❌ Failed to add ${lawyer.email}:`, err.message);
            }
        }
    }

    console.log('\n✨ ASCOLP Login Enablement Complete!');
    console.log(`🔑 All users can now login with: ${DEFAULT_PASSWORD}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
