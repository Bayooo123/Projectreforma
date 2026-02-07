
const fs = require('fs');

const files = [
    'briefs.txt',
    'ascolp_users.txt',
    'ascolp_users.json',
    'workspaces.txt',
    'apply_log.txt',
    'delete_output_v3.txt',
    'db_push_log.txt'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`\n--- ${file} ---`);
        try {
            const buf = fs.readFileSync(file);
            // Try to detect UTF-16LE
            if (buf[0] === 0xff && buf[1] === 0xfe) {
                console.log(buf.toString('utf16le'));
            } else {
                console.log(buf.toString('utf8'));
            }
        } catch (e) {
            console.log(`Error reading ${file}: ${e.message}`);
        }
    } else {
        console.log(`\n--- ${file} NOT FOUND ---`);
    }
});
