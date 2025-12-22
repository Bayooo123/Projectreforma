require('dotenv').config();
const url = process.env.DATABASE_URL || '';
console.log('URL Length:', url.length);
console.log('Contains 6543 (Pooler):', url.includes(':6543'));
console.log('Contains 5432 (Direct):', url.includes(':5432'));
console.log('Contains pooler.supabase:', url.includes('pooler.supabase'));
