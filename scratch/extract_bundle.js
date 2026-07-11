const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Read the HTML bundle from the file we'll save
const htmlPath = process.argv[2];
if (!htmlPath) {
    console.error('Usage: node extract_bundle.js <path-to-html>');
    process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

// Extract manifest
const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const templateMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);

if (!manifestMatch) {
    console.error('Could not find manifest script block.');
    process.exit(1);
}

const manifest = JSON.parse(manifestMatch[1].trim());
console.log('Found assets:', Object.keys(manifest).length);
console.log('MIMEs:', [...new Set(Object.values(manifest).map(e => e.mime))]);

const outDir = path.join(path.dirname(htmlPath), 'unpacked_bundle');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const [uuid, entry] of Object.entries(manifest)) {
    const buffer = Buffer.from(entry.data, 'base64');
    let finalData;
    if (entry.compressed) {
        try { finalData = zlib.gunzipSync(buffer); }
        catch (err) { console.error(`Failed decompress ${uuid}:`, err.message); finalData = buffer; }
    } else {
        finalData = buffer;
    }

    let ext = entry.mime.includes('javascript') ? 'js'
        : entry.mime.includes('jsx') ? 'jsx'
        : entry.mime.includes('html') ? 'html'
        : entry.mime.includes('css') ? 'css'
        : entry.mime.includes('json') ? 'json'
        : 'bin';

    const outPath = path.join(outDir, `${uuid}.${ext}`);
    fs.writeFileSync(outPath, finalData);
    console.log(`Wrote ${outPath} (${finalData.length} bytes)`);
}

if (templateMatch) {
    fs.writeFileSync(path.join(outDir, 'template.html'), templateMatch[1].trim());
    console.log('Wrote template.html');
}
console.log('Done. Files in:', outDir);
