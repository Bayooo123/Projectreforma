const { Client } = require('pg');
const connectionString = "postgresql://postgres.veltyrhvxeiwbhptvczc:REFORMISFROMGOD122%40@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

async function testConnection() {
    const client = new Client({
        connectionString: connectionString,
        connectionTimeoutMillis: 10000,
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Database time:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('Connection error:', err.message);
        process.exit(1);
    }
}

testConnection();
