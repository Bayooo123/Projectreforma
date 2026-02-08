
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
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
}

async function main() {
    console.log('Checking CourtDate records...');
    try {
        const total = await prisma.courtDate.count();
        console.log(`Total CourtDates: ${total}`);

        const allDates = await prisma.courtDate.findMany({
            select: {
                date: true,
                title: true,
                matter: { select: { name: true } },
                briefId: true,
                clientId: true
            },
            orderBy: { date: 'desc' }
        });

        const byMonth: Record<string, number> = {};

        allDates.forEach(d => {
            const key = d.date.toISOString().substring(0, 7); // YYYY-MM
            if (!byMonth[key]) byMonth[key] = 0;
            byMonth[key]++;
        });

        console.log('Counts by Month:');
        console.table(byMonth);

        console.log('Sample of recent dates:');
        allDates.slice(0, 10).forEach(d => {
            console.log(`${d.date.toISOString()} - ${d.title} (Matter: ${d.matter?.name})`);
        });
    } catch (e) {
        console.error(e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
