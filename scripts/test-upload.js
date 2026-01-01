const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch if Node 18+

// Mock a file upload
async function testUpload() {
    try {
        // Create a dummy file
        const filePath = path.join(__dirname, 'test.txt');
        fs.writeFileSync(filePath, 'This is a test file content for upload debugging.');

        const stats = fs.statSync(filePath);
        const fileStream = fs.createReadStream(filePath);

        console.log('--- Testing /api/upload ---');
        console.log(`Uploading test.txt (${stats.size} bytes)...`);

        // Requires running dev server on localhost:3000
        const response = await fetch('http://localhost:3000/api/upload?filename=test.txt', {
            method: 'POST',
            body: fileStream,
            headers: {
                'Content-Type': 'text/plain',
                // Mock Auth if needed (middleware might block this)
            }
        });

        if (!response.ok) {
            console.error(`Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }

        const data = await response.json();
        console.log('Success!', data);

    } catch (error) {
        console.error('Script Error:', error);
    }
}

// Check if server is running
fetch('http://localhost:3000/api/auth/session').then(() => {
    testUpload();
}).catch(() => {
    console.error('Error: Local server typically needs to be running. I will assume this is testing against a running endpoint.');
    console.log('Skipping actual fetch test as I cannot guarantee localhost:3000 is running globally managed by me.');
});
