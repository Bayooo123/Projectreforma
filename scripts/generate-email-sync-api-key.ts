// One-off: generate a Reforma API key directly in the database, the same
// way Settings > API Integrations does (see src/app/actions/api-keys.ts:
// generateApiKey) — bypasses that page's owner/partner role gate, for when
// nobody with that role is available to click "Generate" themselves.
//
// Run with: npx tsx scripts/generate-email-sync-api-key.ts <user-email> ["key name"]
// The name defaults to the email-sync use case this was originally written
// for, but any integration that authenticates as an API key can use this —
// e.g. the Zoom join-bot (zoom-bot/) — just pass a name that says what it's for.
//
// The user must already exist and belong to a workspace — this attributes
// the key to them and their workspace, it doesn't create either.

import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const keyName = process.argv[3] || 'Email sync (IMAP -> Reforma)';
    if (!email) {
        console.error('Usage: npx tsx scripts/generate-email-sync-api-key.ts <user-email> ["key name"]');
        return;
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (!user) {
        console.error(`No user found with email "${email}".`);
        return;
    }

    const membership = await prisma.workspaceMember.findFirst({
        where: { userId: user.id },
        select: { workspaceId: true },
    });
    if (!membership) {
        console.error(`User ${email} is not a member of any workspace.`);
        return;
    }

    const rawKey = randomBytes(32).toString('hex');
    const fullKey = `rf_sk_${rawKey}`;
    const keyHash = createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = fullKey.substring(0, 10);

    await prisma.apiKey.create({
        data: {
            userId: user.id,
            workspaceId: membership.workspaceId,
            name: keyName,
            keyHash,
            keyPrefix,
        },
    });

    console.log(`Generated for ${user.name} (${email}):`);
    console.log('');
    console.log(fullKey);
    console.log('');
    console.log('This is shown once — it is not recoverable after this (only the hash is stored). Copy it now into Vercel as EMAIL_SYNC_API_KEY.');
}

main()
    .catch(err => console.error('Error:', err))
    .finally(() => prisma.$disconnect());
