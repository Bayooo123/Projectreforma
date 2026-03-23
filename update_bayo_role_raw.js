
// update_bayo_role_raw.js
// Uses raw SQL to avoid Prisma schema/DB drift issues
// ONLY updates workspace_member.role — nothing else is touched

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Finding Adebayo Gbadebo (bayo@abiolasanniandco.com)...');

    // Step 1: Get the user id using raw SQL
    const userRows = await prisma.$queryRawUnsafe(
        `SELECT id, name, email FROM "User" WHERE LOWER(email) = 'bayo@abiolasanniandco.com' LIMIT 1`
    );

    if (!userRows || userRows.length === 0) {
        console.error('❌ User not found.');
        return;
    }
    const user = userRows[0];
    console.log(`✅ User: ${user.name} (${user.email}) — ID: ${user.id}`);

    // Step 2: Get ASCOLP workspace
    const wsRows = await prisma.$queryRawUnsafe(
        `SELECT id, name FROM "Workspace" WHERE LOWER(name) LIKE '%ascolp%' LIMIT 1`
    );

    if (!wsRows || wsRows.length === 0) {
        console.error('❌ ASCOLP workspace not found.');
        return;
    }
    const workspace = wsRows[0];
    console.log(`✅ Workspace: ${workspace.name} — ID: ${workspace.id}`);

    // Step 3: Check current membership
    const memRows = await prisma.$queryRawUnsafe(
        `SELECT id, role, designation FROM "WorkspaceMember" WHERE "workspaceId" = $1 AND "userId" = $2 LIMIT 1`,
        workspace.id,
        user.id
    );

    if (!memRows || memRows.length === 0) {
        console.error('❌ No membership found for this user in ASCOLP.');
        return;
    }
    const member = memRows[0];
    console.log(`📋 Current role: "${member.role}" | designation: "${member.designation}"`);

    if (member.role === 'Associate') {
        console.log('✅ Role is already "Associate". No update needed.');
        return;
    }

    // Step 4: Update ONLY the role column —- all privileges intact
    await prisma.$queryRawUnsafe(
        `UPDATE "WorkspaceMember" SET role = 'Associate' WHERE id = $1`,
        member.id
    );

    // Verify
    const verifyRows = await prisma.$queryRawUnsafe(
        `SELECT role, designation FROM "WorkspaceMember" WHERE id = $1`,
        member.id
    );
    const verified = verifyRows[0];
    console.log(`✅ Update complete!`);
    console.log(`   Role is now: "${verified.role}" | designation: "${verified.designation}"`);
    console.log('');
    console.log('ℹ️  All admin/overlord permissions and platform privileges remain UNCHANGED.');
}

main()
    .catch(e => {
        console.error('❌ Error:', e.message || e);
    })
    .finally(() => prisma.$disconnect());
