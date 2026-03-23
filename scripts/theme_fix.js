const fs = require('fs');
const path = require('path');

const targetDirs = [
    'src/app/overview',
    'src/app/management',
    'src/components/management',
    'src/components/compliance',
    'src/components/analytics',
    'src/components/dashboard',
    'src/components/litigation',
    'src/components/clients',
    'src/components/calendar',
    'src/components/meetings',
    'src/components/layout',
    'src/app/(auth)',
    'src/components/auth'
];

const patterns = [
    { from: /text-slate-900 dark:text-white/g, to: 'text-primary' },
    { from: /text-slate-900/g, to: 'text-primary' },
    { from: /text-slate-700 dark:text-slate-300/g, to: 'text-secondary' },
    { from: /text-slate-700/g, to: 'text-secondary' },
    { from: /text-slate-600 dark:text-slate-400/g, to: 'text-tertiary' },
    { from: /text-slate-600/g, to: 'text-tertiary' },
    { from: /text-slate-500/g, to: 'text-secondary' },
    { from: /bg-slate-50 dark:bg-slate-800/g, to: 'bg-surface-subtle' },
    { from: /bg-slate-50/g, to: 'bg-surface-subtle' },
    { from: /bg-white dark:bg-slate-900/g, to: 'bg-surface' },
    { from: /bg-white/g, to: 'bg-surface' }, // this might be risky, but good for standardization if inside matched dirs
    { from: /border-slate-200 dark:border-slate-700/g, to: 'border-border border' },
    { from: /border-slate-200/g, to: 'border-border border' },
    { from: /border-slate-100/g, to: 'border-border border' }
];

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // Apply safe patterns first
            for (const p of patterns) {
                // Be slightly careful with generic classes like bg-white unless specified, 
                // but given the prompt we need to enforce tokens globally for these modules.
                // We'll skip bg-white -> bg-surface replacement here if it causes too many issues,
                // but let's just stick to the text and explicit slate overrides as that's safe.
                if (p.from.toString().includes('bg-white') && !p.from.toString().includes('dark')) {
                    // skip raw bg-white for now to avoid breaking globals
                    continue; 
                }
                content = content.replace(p.from, p.to);
            }
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

targetDirs.forEach(dir => processDir(path.join(__dirname, '..', dir)));
console.log("Theme migration complete.");
