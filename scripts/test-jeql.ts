import { JEQLCompiler } from '../src/lib/jeql/compiler';
import { JEQLQuery } from '../src/lib/jeql/types';

const compiler = new JEQLCompiler();

const testQueries: Record<string, JEQLQuery> = {
    "Simple Filter": {
        "$select": ["id", "name"],
        "$whereAll": [
            ["status", "=", "active"],
            ["price", "<", 1000]
        ]
    },
    "Nested $with and $whereHas": {
        "$select": ["id", "name", "clientId"],
        "$with": {
            "client": {
                "$select": ["id", "name"]
            }
        },
        "$whereHas": {
            "lawyers": {
                "$whereAll": [["role", "=", "senior"]]
            }
        }
    },
    "Complex OR/AND": {
        "$whereAll": [
            ["status", "=", "published"],
            {
                "$whereAny": [
                    ["author_id", "=", 123],
                    ["is_public", "=", true]
                ]
            }
        ]
    },
    "Search across multiple columns": {
        "$select": ["id", "name", "description"],
        "$whereAll": [
            [["name", "description"], "search", "wireless headphones"]
        ]
    },
    "Date between": {
        "$whereAll": [
            ["created_at", "date_between", ["2024-01-01", "2024-01-31"]]
        ]
    }
};

console.log("JEQL Compiler Test Results:\n");

for (const [name, query] of Object.entries(testQueries)) {
    console.log(`--- Test: ${name} ---`);
    console.log("JEQL Query:", JSON.stringify(query, null, 2));
    try {
        const result = compiler.compile(query, name.includes("Nested") ? "Matter" : undefined);
        console.log("Prisma Args:", JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error("Compilation Error:", error.message);
    }
    console.log("\n");
}

// Test validation error: Dot-Notation
console.log("--- Test: Dot-Notation Validation ---");
try {
    compiler.compile({ "$select": ["id", "client.name"] });
} catch (error: any) {
    console.log("Expected Error (Dot-Notation):", error.message);
}

// Test validation error: Missing Relationship Keys
console.log("\n--- Test: Missing Relationship Keys ---");
try {
    // Missing 'clientId' which is required for 'client' relation in Matter mock schema
    compiler.compile({
        "$select": ["id", "name"], 
        "$with": { "client": { "$select": ["id", "name"] } }
    }, "Matter");
} catch (error: any) {
    console.log("Expected Error (Missing Keys):", error.message);
}
