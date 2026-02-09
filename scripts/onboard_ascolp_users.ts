
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

const USERS = [
    { name: 'Professor Abiola Sanni, SAN', email: 'asanni@abiolasanniandco.com', role: 'Partner', designation: 'Head of Firm' },
    { name: 'Kola Abdulsalam', email: 'kola@abiolasanniandco.com', role: 'Head of Chambers', designation: 'Head of Chambers' },
    { name: 'Iniobong Inieke Umoh', email: 'iniobong@abiolasanniandco.com', role: 'Deputy Head of Chambers', designation: 'Deputy Head of Chambers' },
    { name: 'Josephine Oginaka', email: 'riwo@abiolasanniandco.com', role: 'Associate', designation: 'Associate' },
    { name: 'Omowumi Adeoye', email: 'omowumi@abiolasanniandco.com', role: 'Associate', designation: 'Associate' },
    { name: 'Maureen Omaegbu', email: 'maureen@abiolasanniandco.com', role: 'Associate', designation: 'Associate' },
    { name: 'Adeola Adeoye', email: 'ade@abiolasanniandco.com', role: 'Associate', designation: 'Associate' },
    { name: 'Benjamin Adeyanju', email: 'ben@abiolasanniandco.com', role: 'Associate', designation: 'Associate' },
    { name: 'Adebayo Gbadebo', email: 'bayo@abiolasanniandco.com', role: 'Owner', designation: 'Associate' },
    { name: 'Henrietta Ofodirinwa', email: 'henrietta@abiolasanniandco.com', role: 'Practice Manager', designation: 'Practice Manager' },
    { name: 'Tosin Omisade', email: 'tosin@abiolasanniandco.com', role: 'Associate', designation: 'Associate' },
    { name: 'Samuel Adeleye', email: 'samuel@abiolasanniandco.com', role: 'Associate', designation: 'Associate' }
];

async function main() {
    console.log('Starting ASCOLP User Onboarding...');

    // 1. Get ASCOLP Workspace
    const workspace = await prisma.workspace.findFirst({
        where: { name: { contains: 'ASCOLP', mode: 'insensitive' } }
    });

    if (!workspace) {
        console.error('❌ ASCOLP workspace not found!');
        return;
    }
    console.log(`Target Workspace: ${workspace.name} (${workspace.id})`);

    const defaultPassword = 'Ascolp#2026';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    for (const u of USERS) {
        const email = u.email.toLowerCase(); // Enforce lowercase

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log(`Creating new user: ${u.name} (${email})`);
            const lawyerToken = `LT-${nanoid(10)}`;
            user = await prisma.user.create({
                data: {
                    name: u.name,
                    email: email,
                    password: hashedPassword,
                    lawyerToken: lawyerToken,
                    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`
                }
            });
        } else {
            console.log(`Updating existing user: ${u.name} (${email})`);
            // Optionally update name if changed, but be careful not to overwrite user preferences
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: u.name,
                    // Ensure lawyerToken exists
                    lawyerToken: user.lawyerToken || `LT-${nanoid(10)}`
                }
            });
        }

        // 3. Upsert Workspace Membership
        console.log(`> Updating membership for ${u.name}...`);

        await prisma.workspaceMember.upsert({
            where: {
                workspaceId_userId: {
                    workspaceId: workspace.id,
                    userId: user.id
                }
            },
            update: {
                role: u.role,
                designation: u.designation,
                status: 'active'
            },
            create: {
                workspaceId: workspace.id,
                userId: user.id,
                role: u.role,
                designation: u.designation,
                status: 'active'
            }
        });
    }

    console.log('✅ Onboarding complete.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
