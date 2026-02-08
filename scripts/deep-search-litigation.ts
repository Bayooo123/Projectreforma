
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// Manual .env loading
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

async function main() {
    console.log('--- STARTING DEEP SEARCH ---');

    // 1. Find Workspace
    const workspace = await prisma.workspace.findFirst({
        where: { OR: [{ slug: 'ascolp' }, { name: { contains: 'ascolp', mode: 'insensitive' } }] }
    });

    if (!workspace) {
        console.error('ASCOLP Workspace not found!');
        return;
    }
    console.log(`Found Workspace: ${workspace.name} (${workspace.id})`);

    // 2. Count Court Dates
    const courtDatesCount = await prisma.courtDate.count({
        where: { matter: { workspaceId: workspace.id } }
    });
    console.log(`Total CourtDates in Workspace: ${courtDatesCount}`);

    // 3. Dump recent CourtDates (Jan/Feb 2026)
    // Note: User said Jan/Feb. Assuming 2026 based on current time (Feb 2026).
    const startObj = new Date('2026-01-01');
    const endObj = new Date('2026-03-01');

    const recentDates = await prisma.courtDate.findMany({
        where: {
            matter: { workspaceId: workspace.id },
            date: {
                gte: startObj,
                lte: endObj
            }
        },
        include: {
            matter: { select: { name: true, caseNumber: true } }
        },
        orderBy: { date: 'asc' }
    });

    console.log(`\n--- Court Dates (Jan-Feb 2026) [Found: ${recentDates.length}] ---`);
    recentDates.forEach(d => {
        console.log(`[${d.date.toISOString().split('T')[0]}] ${d.matter.name} (${d.title})`);
    });

    // 4. Check Matter Activity Logs for "court_date_changed" or "proceedings_recorded"
    console.log(`\n--- Searching Activity Logs for trace of dates ---`);
    const logs = await prisma.matterActivityLog.findMany({
        where: {
            matter: { workspaceId: workspace.id },
            OR: [
                { activityType: 'court_date_changed' },
                { activityType: 'proceedings_recorded' },
                { description: { contains: 'adjourn', mode: 'insensitive' } },
                { description: { contains: 'court', mode: 'insensitive' } }
            ],
            timestamp: {
                gte: startObj
            }
        },
        include: {
            matter: { select: { name: true } }
        },
        orderBy: { timestamp: 'desc' }
    });

    logs.forEach(l => {
        console.log(`[Log ${l.timestamp.toISOString().split('T')[0]}] Matter: ${l.matter.name} | Type: ${l.activityType} | ${l.description}`);
    });

    // 5. Check for "Orphaned" CourtDates (if any filtering issues existed)
    // Checking if there are any court dates that are NOT linked to the workspace properly?
    // (Prisma relation filtering already handles this, but let's check basic count mismatch if we just query by date without workspace filter and see if they belong to 'null' workspace or something weird - though schema forbids it)

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
