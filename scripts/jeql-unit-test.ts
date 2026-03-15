
import { JEQLCompiler } from '../src/lib/jeql/compiler';

// Mocking imports since we are running in a script environment without full Next.js context
// We only need the compiler logic, which doesn't depend on Prisma at compilation time.

const compiler = new JEQLCompiler();

function assertEquals(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        console.error(`❌ FAILED: ${message}`);
        console.error(`   Expected: ${e}`);
        console.error(`   Actual:   ${a}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

console.log('Running JEQL Compiler Unit Tests...\n');

// 1. Basic select
assertEquals(
    compiler.compile({ $select: ['id', 'name'] }),
    { select: { id: true, name: true } },
    'Basic select'
);

// 2. Simple where
assertEquals(
    compiler.compile({ $whereAll: [['status', '=', 'active']] }),
    { where: { status: 'active' } },
    'Simple whereAll'
);

// 3. Complex date operators
const nowStr = new Date().toISOString();
assertEquals(
    compiler.compile({ $whereAll: [['createdAt', 'date>', nowStr]] }),
    { where: { createdAt: { gt: new Date(nowStr) } } },
    'Date greater than'
);

// 4. In operator
assertEquals(
    compiler.compile({ $whereAll: [['id', 'in', ['1', '2']]] }),
    { where: { id: { in: ['1', '2'] } } },
    'In operator'
);

// 5. Nested logical groups
assertEquals(
    compiler.compile({
        $whereAll: [
            ['category', '=', 'legal'],
            { $whereAny: [['status', '=', 'active'], ['priority', '=', 'high']] }
        ]
    }),
    {
        where: {
            AND: [
                { category: 'legal' },
                { OR: [{ status: 'active' }, { priority: 'high' }] }
            ]
        }
    },
    'Nested logical groups'
);

// 6. $whereHas existence filter (Reformatted tuple style)
assertEquals(
    compiler.compile({
        $whereHas: [
            ['briefs', [['status', '=', 'filed']]]
        ]
    }),
    {
        where: {
            briefs: { some: { status: 'filed' } }
        }
    },
    'whereHas'
);

// 7. $whereNotHas
assertEquals(
    compiler.compile({
        $whereNotHas: [
            ['tasks', [['status', '!=', 'completed']]]
        ]
    }),
    {
        where: {
            tasks: { none: { status: { not: 'completed' } } }
        }
    },
    'whereNotHas'
);

// 8. Ordering and Pagination
assertEquals(
    compiler.compile({
        $orderBy: [['createdAt', 'desc']],
        $limit: 10,
        $offset: 20
    }),
    {
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
        skip: 20
    },
    'Ordering and Pagination'
);

// 9. Search operator (multi-column)
assertEquals(
    compiler.compile({
        $whereAll: [['name', 'search', 'Okafor']]
    }),
    {
        where: { name: { contains: 'Okafor', mode: 'insensitive' } }
    },
    'Search operator (single column)'
);

assertEquals(
    compiler.compile({
        $whereAll: [[['name', 'email'], 'search', 'Okafor']]
    }),
    {
        where: {
            OR: [
                { name: { contains: 'Okafor', mode: 'insensitive' } },
                { email: { contains: 'Okafor', mode: 'insensitive' } }
            ]
        }
    },
    'Search operator (multi column)'
);

console.log('\nAll JEQL Unit Tests Passed!');
