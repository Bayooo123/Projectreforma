// Sends a one-off custom WhatsApp message to every active member of a
// workspace who has a phone number on file. For deliberate, manually-issued
// firm-wide announcements (a case listing, a policy change) — NOT routed
// through the automated nudge gate (src/lib/agents/whatsapp/notify-gate.ts):
// no quiet-hours check, no daily cap, since this is a human personally
// choosing to send this right now, not an automated system nudge.
//
// The message text is read from a local file rather than hardcoded here or
// passed as a shell argument, so nothing about a specific announcement (a
// case name, a client detail) ever needs to be typed into a committed
// script or left sitting in shell history.
//
// Run with: npx tsx scripts/send-workspace-broadcast.ts <path-to-message.txt> [workspace-slug]
// Omit workspace-slug to target the firm's oldest (i.e. only, in a
// single-workspace deployment) workspace.

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const GRAPH_URL = 'https://graph.facebook.com/v21.0';

async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
        console.error('WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set in the environment.');
        return false;
    }

    const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text },
        }),
    });
    if (!res.ok) {
        console.error(`  Failed (${res.status}): ${await res.text().catch(() => '')}`);
        return false;
    }
    return true;
}

async function main() {
    const messagePath = process.argv[2];
    const workspaceSlug = process.argv[3];
    if (!messagePath) {
        console.error('Usage: npx tsx scripts/send-workspace-broadcast.ts <path-to-message.txt> [workspace-slug]');
        return;
    }

    const message = readFileSync(messagePath, 'utf-8').trim();
    if (!message) {
        console.error('Message file is empty.');
        return;
    }

    const workspace = workspaceSlug
        ? await prisma.workspace.findUnique({ where: { slug: workspaceSlug }, select: { id: true, name: true } })
        : await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true } });
    if (!workspace) {
        console.error('Workspace not found.');
        return;
    }

    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id, status: 'active' },
        select: { user: { select: { name: true, phone: true } } },
    });
    const withPhone = members.filter((m): m is typeof m & { user: { phone: string } } => !!m.user.phone);

    console.log(`Workspace: ${workspace.name}`);
    console.log(`Sending to ${withPhone.length} of ${members.length} member(s).\n`);
    console.log('--- Message ---');
    console.log(message);
    console.log('---------------\n');

    let sent = 0, failed = 0;
    for (const m of withPhone) {
        const phone = m.user.phone.replace(/\D/g, '');
        const ok = await sendWhatsAppMessage(phone, message);
        console.log(`${ok ? 'Sent' : 'FAILED'} — ${m.user.name}`);
        if (ok) sent++; else failed++;
    }

    console.log(`\nDone: ${sent} sent, ${failed} failed.`);
}

main()
    .catch(err => console.error('Error:', err))
    .finally(() => prisma.$disconnect());
