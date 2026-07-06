import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// Emails verified against muhammedadam.com domain
// password = first name of each user
const USERS = [
    { name: 'Mr Muhammed Adam',       email: 'adam@muhammedadam.com',        role: 'Principal Partner',  designation: 'Principal',             password: 'Muhammed'   },
    { name: 'Mr Ojeh Godwin',         email: 'ojeh@muhammedadam.com',        role: 'Senior Associate',   designation: 'Senior Associate',      password: 'Ojeh'       },
    { name: 'Mr Shuaib Muhammed',     email: 'shuaib@muhammedadam.com',      role: 'Head of Chamber',    designation: 'Senior Associate & HOC', password: 'Shuaib'    },
    { name: 'Ms Bashirat Yahaya',     email: 'bashirat@muhammedadam.com',    role: 'Associate',          designation: 'Associate',             password: 'Bashirat'   },
    { name: 'Mr Lawal-Tunji Lawal',   email: 'lawal@muhammedadam.com',       role: 'Associate',          designation: 'Associate',             password: 'Lawal-Tunji'},
    { name: 'Ms Jane Ugbala',         email: 'jane@muhammedadam.com',        role: 'Associate',          designation: 'Associate',             password: 'Jane'       },
    { name: 'Mr Mojeed Olatunji',     email: 'litigation@muhammedadam.com',  role: 'Associate',          designation: 'Litigation Officer',    password: 'Mojeed'     },
];

const PEACE_BASSEY_NEW_EMAIL = 'accounts@muhammedadam.com';

async function main() {
    console.log('Starting Muhammed Adam & Associates User Onboarding...');

    const workspace = await prisma.workspace.findFirst({
        where: { name: { contains: 'muhammed', mode: 'insensitive' } }
    });

    if (!workspace) {
        console.error('❌ Muhammed Adam workspace not found! Make sure the workspace exists.');
        return;
    }
    console.log(`✅ Target Workspace: ${workspace.name} (${workspace.id})`);

    for (const u of USERS) {
        const email = u.email.toLowerCase();
        const hashedPassword = await bcrypt.hash(u.password, 10);

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log(`  Creating new user: ${u.name} (${email})`);
            user = await prisma.user.create({
                data: {
                    name: u.name,
                    email,
                    password: hashedPassword,
                    lawyerToken: `LT-${nanoid(10)}`,
                    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`
                }
            });
        } else {
            console.log(`  Updating existing user: ${u.name} (${email})`);
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: u.name,
                    lawyerToken: user.lawyerToken || `LT-${nanoid(10)}`
                }
            });
        }

        await prisma.workspaceMember.upsert({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
            update:  { role: u.role, designation: u.designation, status: 'active' },
            create:  { workspaceId: workspace.id, userId: user.id, role: u.role, designation: u.designation, status: 'active' }
        });

        console.log(`  ✓ ${u.name} → ${u.role} (${u.designation}) | password: ${u.password}`);
    }

    // Update Peace Bassey's email to the accounts@ address
    console.log('\nUpdating Peace Bassey email...');
    const peaceBasseyByName = await prisma.user.findFirst({
        where: { name: { contains: 'Peace', mode: 'insensitive' } }
    });

    if (!peaceBasseyByName) {
        console.warn('  ⚠️  Peace Bassey not found by name. Skipping email update.');
    } else {
        const peaceHashedPassword = await bcrypt.hash('Peace', 10);
        await prisma.user.update({
            where: { id: peaceBasseyByName.id },
            data: { email: PEACE_BASSEY_NEW_EMAIL, password: peaceHashedPassword }
        });
        console.log(`  ✓ Updated Peace Bassey (${peaceBasseyByName.email} → ${PEACE_BASSEY_NEW_EMAIL}) | password: Peace`);

        // Also ensure she is a member of this workspace
        await prisma.workspaceMember.upsert({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId: peaceBasseyByName.id } },
            update:  { status: 'active' },
            create:  { workspaceId: workspace.id, userId: peaceBasseyByName.id, role: 'Associate', designation: 'Accounts', status: 'active' }
        });
        console.log('  ✓ Peace Bassey workspace membership confirmed.');
    }

    console.log('\n✅ Onboarding complete.');
    console.log('   Each account password = their first name (e.g. Muhammed, Ojeh, Shuaib…)');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
