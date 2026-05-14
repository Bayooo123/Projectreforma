import { sendWeeklyDigestAllWorkspaces } from './src/lib/weeklyDigest';

async function main() {
    console.log('Sending weekly digest...');
    const results = await sendWeeklyDigestAllWorkspaces();
    console.log('Results:', JSON.stringify(results, null, 2));
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
