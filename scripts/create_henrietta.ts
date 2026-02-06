
import { prisma } from '../src/lib/prisma';
import { hash } from 'bcryptjs';

async function main() {
    console.log('Finding ASCOLP workspace...');

    // Find workspace by name containing "Abiola" or "ASCOLP"
    const workspace = await prisma.workspace.findFirst({
        where: {
            OR: [
                { name: { contains: 'Abiola', mode: 'insensitive' } },
                { name: { contains: 'ASCOLP', mode: 'insensitive' } }
            ]
        }
    });

    if (!workspace) {
        console.error('ASCOLP Workspace not found!');
        return;
    }

    console.log(`Found workspace: ${workspace.name} (${workspace.id})`);

    const email = 'info@abiolasanniandco.com';
    const name = 'Henrietta Ofodirinya';
    const role = 'Practice Manager'; // Or whatever role fits, likely 'manage' or custom

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log(`User ${email} already exists. Updating workspace/role if needed...`);
        // Logic to update if needed, but for now just report
        console.log('User details:', existingUser);
        return;
    }

    // Create new user
    // Generate a default password
    const hashedPassword = await hash('Reforma123!', 12);

    /* 
       Note: The user schema might vary. 
       I need to check the User model to ensure I'm providing all required fields.
       Based on previous turns, there might be 'lawyerToken' or other fields.
    */

    console.log('Creating new user...');

    try {
        // 1. Create the User
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                // WorkspaceMember association
                workspaces: {
                    create: {
                        workspaceId: workspace.id,
                        role: 'member', // Default role, or could be 'admin' if Practice Manager implies that
                        designation: role, // 'Practice Manager'
                        status: 'active'
                    }
                }
            },
            include: {
                workspaces: true
            }
        });
        console.log(`User created successfully: ${newUser.name} (${newUser.email})`);
        console.log(`Added to workspace: ${workspace.name} as ${role}`);
    } catch (e) {
        console.error('Error creating user:', e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
