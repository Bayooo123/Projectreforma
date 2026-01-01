const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function createProfSanni() {
    try {
        console.log('--- Creating Account for Professor Abiola Sanni SAN ---');

        // 1. Find Workspace
        const workspace = await prisma.workspace.findFirst({
            where: {
                name: { contains: 'ASCOLP', mode: 'insensitive' }
            }
        });

        if (!workspace) {
            console.log('Error: ASCOLP workspace not found');
            return;
        }
        console.log(`Target Workspace: ${workspace.name}`);

        // 2. User Details
        const email = 'Asanni@abiolasanniandco.com';
        const name = 'Professor Abiola Sanni SAN';
        const tempPassword = 'Login@2026'; // Temporary password
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // 3. Check if user exists
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            console.log(`User ${email} already exists. Updating details...`);
            user = await prisma.user.update({
                where: { email },
                data: {
                    name,
                    password: hashedPassword, // Reset password to known temp
                    jobTitle: 'Partner'
                }
            });
        } else {
            console.log(`Creating new user for ${email}...`);
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    password: hashedPassword,
                    jobTitle: 'Partner',
                    emailVerified: new Date()
                }
            });
        }

        // 4. Add to Workspace as Owner/Partner
        const membership = await prisma.workspaceMember.upsert({
            where: {
                workspaceId_userId: {
                    workspaceId: workspace.id,
                    userId: user.id
                }
            },
            update: {
                role: 'owner', // Grant owner privileges
                designation: 'Managing Partner',
                status: 'active'
            },
            create: {
                workspaceId: workspace.id,
                userId: user.id,
                role: 'owner',
                designation: 'Managing Partner',
                status: 'active'
            }
        });

        console.log('\n=============================================');
        console.log('ACCOUNT CREATED SUCCESSFULLY');
        console.log('=============================================');
        console.log(`Name:      ${user.name}`);
        console.log(`Email:     ${user.email}`);
        console.log(`Password:  ${tempPassword}`);
        console.log(`Workspace: ${workspace.name}`);
        console.log(`Role:      ${membership.designation} (${membership.role})`);
        console.log('=============================================');

    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createProfSanni();
