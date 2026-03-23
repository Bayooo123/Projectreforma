
// update_bayo_role.js
// Changes Adebayo Gbadebo's WorkspaceMember role in ASCOLP to 'Associate'
// while preserving ALL other privileges (platform admin, overlord, etc.)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Finding Adebayo Gbadebo in the database...');

    // Find user by email (both known email variants)
    const user = await prisma.user.findFirst({
        where: {
            email: { in: ['bayo@abiolasanniandco.com', 'Bayo@abiolasanniandco.com'] }
        }
    });

    if (!user) {
        console.error('❌ User not found. Check email address.');
        return;
    }
    console.log(`✅ Found user: ${user.name} (${user.email}) — ID: ${user.id}`);

    // Find ASCOLP workspace
    const workspace = await prisma.workspace.findFirst({
        where: { name: { contains: 'ASCOLP', mode: 'insensitive' } }
    });

    if (!workspace) {
        console.error('❌ ASCOLP workspace not found.');
        return;
    }
    console.log(`✅ Found workspace: ${workspace.name} (${workspace.id})`);

    // Check current membership
    const membership = await prisma.workspaceMember.findFirst({
        where: { workspaceId: workspace.id, userId: user.id }
    });

    if (!membership) {
        console.error('❌ No membership record found for Adebayo in ASCOLP.');
        return;
    }
    console.log(`📋 Current role: "${membership.role}" | designation: "${membership.designation}"`);

    // Only update 'role' to 'Associate' — leave ALL other fields unchanged
    const updated = await prisma.workspaceMember.update({
        where: { id: membership.id },
        data: { role: 'Associate' }
    });

    console.log(`✅ Role updated successfully!`);
    console.log(`   New role: "${updated.role}" | designation: "${updated.designation}"`);

    // Also check if workspace.ownerId points to this user and warn (but DO NOT change it)
    if (workspace.ownerId === user.id) {
        console.log('');
        console.log('⚠️  NOTE: The workspace.ownerId still points to Adebayo Gbadebo.');
        console.log('   This controls certain platform-level controls but does NOT affect');
        console.log('   his visible role as shown in the member list (which is now Associate).');
        console.log('   If you want to reassign workspace ownership entirely, do so manually.');
    }
}

main()
    .catch(e => {
        console.error('❌ Error:', e.message);
    })
    .finally(() => prisma.$disconnect());
