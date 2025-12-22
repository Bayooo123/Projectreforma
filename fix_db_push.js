const { exec } = require('child_process');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
}

// Replace port 6543 (Transaction Pooler) with 5432 (Direct Session)
// Supabase Transaction Pooler usually runs on 6543. Direct is 5432.
const directUrl = dbUrl.replace(':6543', ':5432');

console.log('🔄 Detected Supabase Pooler. Switching to Direct Connection for Schema Push...');

// Run prisma db push with the modified DIRECT_URL
// Note: We set both because schema.prisma now expects DIRECT_URL
const command = `npx prisma db push --accept-data-loss`;

const env = {
    ...process.env,
    DATABASE_URL: dbUrl, // Keep original for normal connection
    DIRECT_URL: directUrl // Use port 5432 for migration/push
};

const child = exec(command, { env });

child.stdout.on('data', (data) => console.log(data));
child.stderr.on('data', (data) => console.error(data));

child.on('close', (code) => {
    if (code === 0) {
        console.log('✅ Database Schema Synced Successfully!');
    } else {
        console.error(`❌ DB Push failed with code ${code}`);
    }
});
