const fs = require('fs');
require('dotenv').config();

console.log("Checking Environment Variables:");
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL length:", process.env.DATABASE_URL.length);
    console.log("DATABASE_URL starts with:", process.env.DATABASE_URL.substring(0, 10));
} else {
    console.log("DATABASE_URL is missing or empty");
}

console.log("DIRECT_URL exists:", !!process.env.DIRECT_URL);
