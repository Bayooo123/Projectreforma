
import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Explicitly load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Applying Schema using explicit env vars...');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing!');
    process.exit(1);
}

const cmd = '.\\node_modules\\.bin\\prisma db push --accept-data-loss';

console.log(`Running: ${cmd}`);

exec(cmd, { env: process.env }, (error, stdout, stderr) => {
    const logContent = `ERROR: ${error}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`;
    try {
        fs.writeFileSync('apply_log.txt', logContent);
        console.log("Log written to apply_log.txt");
    } catch (e) {
        console.error("Failed to write log file:", e);
    }

    if (error) {
        console.error(`exec error: ${error}`);
        console.error(`STDERR: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
});
