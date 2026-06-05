
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Email Normalization...');

    // 1. Normalize Users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users. Checking for mixed-case emails...`);

    for (const user of users) {
        const lowerEmail = user.email.toLowerCase();
        if (user.email !== lowerEmail) {
            console.log(`Normalizing user: ${user.email} -> ${lowerEmail}`);

            // Check for conflict
            const existing = await prisma.user.findUnique({ where: { email: lowerEmail } });
            if (existing && existing.id !== user.id) {
                console.error(`❌ CONFLICT: User ${user.id} (${user.email}) conflicts with existing ${existing.id} (${existing.email}). SKIPPING.`);
                // In a real scenario, we might merge. For now, we skip to avoid data loss.
                continue;
            }

            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { email: lowerEmail }
                });
                console.log('✅ Updated.');
            } catch (e) {
                console.error(`❌ Error updating user ${user.id}:`, e);
            }
        }
    }

    // 2. Normalize Invitations
    const invitations = await prisma.invitation.findMany();
    console.log(`Found ${invitations.length} invitations. Checking...`);

    for (const invite of invitations) {
        const lowerEmail = invite.email.toLowerCase();
        if (invite.email !== lowerEmail) {
            console.log(`Normalizing invite: ${invite.email} -> ${lowerEmail}`);
            try {
                // Invitations might not have unique constraint on email alone (usually combined with workspace), 
                // but let's be safe. Schema says unique([workspaceId, email])? No, schema says @@index([email]). 
                // Ah, check schema. Invitation has no unique constraint on email globally, usually.
                // Schema check: 
                // model Invitation { ... @@index([email]) } -> No unique constraint on email column itself?
                // Wait, logic says yes. Let's just update.

                await prisma.invitation.update({
                    where: { id: invite.id },
                    data: { email: lowerEmail }
                });
                console.log('✅ Updated.');
            } catch (e) {
                console.error(`❌ Error updating invite ${invite.id}:`, e);
            }
        }
    }

    // 3. Normalize Clients (Optional but good)
    const clients = await prisma.client.findMany();
    console.log(`Found ${clients.length} clients. Checking...`);
    for (const client of clients) {
        const lowerEmail = client.email.toLowerCase();
        if (client.email !== lowerEmail) {
            console.log(`Normalizing client: ${client.email} -> ${lowerEmail}`);
            // Clients have unique email? Schema: email String @unique
            const existing = await prisma.client.findUnique({ where: { email: lowerEmail } });
            if (existing && existing.id !== client.id) {
                console.error(`❌ CONFLICT: Client ${client.id} conflicts. Skipping.`);
                continue;
            }
            await prisma.client.update({
                where: { id: client.id },
                data: { email: lowerEmail }
            });
            console.log('✅ Updated.');
        }
    }

    console.log('Normalization complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
