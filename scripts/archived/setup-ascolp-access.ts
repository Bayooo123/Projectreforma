import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateUniqueLawyerToken } from '../src/lib/lawyer-tokens';
import { ASCOLP_LAWYERS } from '../src/lib/firm-directory';

const prisma = new PrismaClient();

async function main() {
    const DEFAULT_PASSWORD = 'password12345';
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const DEFAULT_FIRM_CODE = '001_2025';
    const DEFAULT_FIRM_PW = await bcrypt.hash('reforma123', 10);

    console.log('🚀 Starting ASCOLP Quick Access Setup...');

    // 1. Ensure ASCOLP Workspace exists
    let workspace = await prisma.workspace.findFirst({
        where: {
            OR: [
                { name: { contains: 'ASCOLP', mode: 'insensitive' } },
                { slug: { contains: 'ascolp', mode: 'insensitive' } }
            ]
        }
    });

    if (!workspace) {
        console.log('➕ ASCOLP Workspace not found. Creating it...');
        workspace = await prisma.workspace.create({
            data: {
                name: 'ASCOLP',
                slug: 'ascolp-uNfwr9', // Preserve known slug
                firmCode: DEFAULT_FIRM_CODE,
                joinPassword: DEFAULT_FIRM_PW,
                owner: {
                    create: {
                        email: 'Asanni@abiolasanniandco.com',
                        name: 'Professor Abiola Sanni SAN',
                        password: hashedPassword,
                        emailVerified: new Date(),
                        lawyerToken: await generateUniqueLawyerToken()
                    }
                }
            }
        });

        // Add owner as a member
        const owner = await prisma.user.findUnique({ where: { email: 'Asanni@abiolasanniandco.com' } });
        if (owner) {
            await prisma.workspaceMember.create({
                data: {
                    workspaceId: workspace.id,
                    userId: owner.id,
                    role: 'owner',
                    designation: 'Managing Partner',
                    status: 'active'
                }
            });
        }
    } else {
        console.log(`📍 Found Existing Workspace: ${workspace.name} (${workspace.id})`);
        // Ensure firm code is set for legacy support in UI
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: { firmCode: DEFAULT_FIRM_CODE }
        });
    }

    console.log(`👥 Processing ${ASCOLP_LAWYERS.length} lawyers from directory...`);

    for (const lawyer of ASCOLP_LAWYERS) {
        console.log(`处理ing: ${lawyer.email}...`);
        try {
            const lawyerToken = await generateUniqueLawyerToken();

            // Upsert User
            const user = await prisma.user.upsert({
                where: { email: lawyer.email },
                update: {
                    password: hashedPassword,
                    emailVerified: new Date(),
                    name: lawyer.name
                },
                create: {
                    email: lawyer.email,
                    name: lawyer.name,
                    password: hashedPassword,
                    emailVerified: new Date(),
                    lawyerToken
                }
            });

            // Upsert Membership
            await prisma.workspaceMember.upsert({
                where: {
                    workspaceId_userId: {
                        workspaceId: workspace.id,
                        userId: user.id
                    }
                },
                update: {
                    status: 'active',
                    designation: lawyer.designation,
                    role: lawyer.designation?.toLowerCase().includes('partner') ? 'partner' : 'associate'
                },
                create: {
                    workspaceId: workspace.id,
                    userId: user.id,
                    role: lawyer.designation?.toLowerCase().includes('partner') ? 'partner' : 'associate',
                    status: 'active',
                    designation: lawyer.designation
                }
            });

            console.log(`   ✅ Enabled access for ${lawyer.email}`);
        } catch (err: any) {
            console.error(`   ❌ Failed to setup ${lawyer.email}:`, err.message);
        }
    }

    console.log('\n✨ ASCOLP Access Setup Complete!');
    console.log(`🔑 All team members can now login with email and password: ${DEFAULT_PASSWORD}`);
    console.log(`🏢 Firm Code (if needed): ${DEFAULT_FIRM_CODE}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
