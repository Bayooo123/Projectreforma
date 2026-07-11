const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

async function main() {
    const logPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\89ef7296-1415-4e80-984e-3c42c3b8d223\\.system_generated\\logs\\transcript.jsonl';
    if (!fs.existsSync(logPath)) {
        console.error('Log file does not exist at:', logPath);
        return;
    }

    const lines = fs.readFileSync(logPath, 'utf8').split('\n');
    let lastUserRequest = '';

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
            const step = JSON.parse(line);
            if (step.type === 'USER_INPUT' || (step.source === 'USER_EXPLICIT' && step.content)) {
                // Check if this content contains the doctype
                if (step.content.includes('<!DOCTYPE html>') && step.content.includes('Reforma — Mobile Redesign')) {
                    lastUserRequest = step.content;
                    break;
                }
            }
        } catch (e) {
            // Ignore parse errors for incomplete lines
        }
    }

    if (!lastUserRequest) {
        console.error('Could not find user request with HTML bundle in logs.');
        return;
    }

    console.log('Found user request. Extracting scripts...');

    // Extract manifest
    const manifestMatch = lastUserRequest.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
    const templateMatch = lastUserRequest.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);

    if (!manifestMatch) {
        console.error('Could not find manifest script block.');
        return;
    }

    const manifest = JSON.parse(manifestMatch[1].trim());
    console.log('Manifest keys:', Object.keys(manifest));

    const outDir = path.join(__dirname, 'unpacked');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    for (const [uuid, entry] of Object.entries(manifest)) {
        console.log(`Decoding ${uuid} (${entry.mime}, compressed: ${entry.compressed})...`);
        const buffer = Buffer.from(entry.data, 'base64');
        let finalData;

        if (entry.compressed) {
            try {
                finalData = zlib.gunzipSync(buffer);
            } catch (err) {
                console.error(`Failed to decompress ${uuid}:`, err);
                finalData = buffer;
            }
        } else {
            finalData = buffer;
        }

        let ext = 'bin';
        if (entry.mime.includes('javascript')) ext = 'js';
        else if (entry.mime.includes('html')) ext = 'html';
        else if (entry.mime.includes('css')) ext = 'css';
        else if (entry.mime.includes('jsx')) ext = 'jsx';
        else if (entry.mime.includes('json')) ext = 'json';

        const outPath = path.join(outDir, `${uuid}.${ext}`);
        fs.writeFileSync(outPath, finalData);
        console.log(`Wrote ${outPath}`);
    }

    if (templateMatch) {
        fs.writeFileSync(path.join(outDir, 'template.html'), templateMatch[1].trim());
        console.log('Wrote template.html');
    }
}

main().catch(console.error);
