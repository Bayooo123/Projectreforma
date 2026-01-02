const { spawn } = require('child_process');
require('dotenv').config();

console.log('Starting programmatic prisma db push...');

// Ensure env vars are present
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing!');
    process.exit(1);
}

const path = require('path');
const prismaPath = path.join(process.cwd(), 'node_modules', '.bin', 'prisma.cmd');

console.log(`Using prisma binary: ${prismaPath}`);

// 1. Run Generate
console.log('Running prisma generate...');
const generate = spawn(prismaPath, ['generate'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
});

generate.on('close', (gCode) => {
    if (gCode !== 0) {
        console.error(`Prisma generate failed with code ${gCode}`);
        process.exit(gCode);
    }

    // 2. Run DB Push
    console.log('Running prisma db push...');
    const push = spawn(prismaPath, ['db', 'push', '--accept-data-loss'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env }
    });

    push.on('close', (pCode) => {
        console.log(`Prisma db push exited with code ${pCode}`);
        process.exit(pCode);
    });
});
