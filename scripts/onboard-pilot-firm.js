const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

const prisma = new PrismaClient();

async function onboardPilotFirm(firmName, adminEmail, adminName) {
    try {
        console.log(`\n--- Onboarding Pilot Firm: ${firmName} ---`);

        // 1. Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingUser) {
            console.error(`Error: User with email ${adminEmail} already exists.`);
            return;
        }

        // 2. Generate slug and temporary password
        const slug = firmName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + nanoid(4);
        // Generate a random secure 12-character password
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let tempPassword = "";
        for (let i = 0; i < 12; i++) {
            tempPassword += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // 3. Create Workspace
        const workspace = await prisma.workspace.create({
            data: {
                name: firmName,
                slug: slug,
                brandColor: '#121826', // Default brand color
                owner: {
                    create: {
                        email: adminEmail,
                        name: adminName,
                        password: hashedPassword,
                    }
                }
            }
        });

        const ownerId = workspace.ownerId;

        // 4. Create Workspace Member (as Owner)
        await prisma.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId: ownerId,
                role: 'owner',
                designation: 'Managing Partner',
                status: 'active'
            }
        });

        console.log('\n✅ Onboarding Successful!');
        console.log('---------------------------');
        console.log(`Firm Name:      ${firmName}`);
        console.log(`Workspace ID:   ${workspace.id}`);
        console.log(`Workspace Slug: ${slug}`);
        console.log(`Login URL:      https://app.reforma.ng/login`);
        console.log(`\n--- ADMIN CREDENTIALS ---`);
        console.log(`Email:          ${adminEmail}`);
        console.log(`Password:       ${tempPassword}`);
        console.log('---------------------------\n');
        console.log('PLEASE SHARE THESE CREDENTIALS SECURELY WITH THE FIRM.');

    } catch (error) {
        console.error('Onboarding failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Get arguments from command line
const args = process.argv.slice(2);
if (args.length < 3) {
    console.log('Usage: node scripts/onboard-pilot-firm.js "Firm Name" "admin@email.com" "Admin Name"');
} else {
    onboardPilotFirm(args[0], args[1], args[2]);
}
