
import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Bica Platform Integration Test 
 * 
 * Verifies the /api/bica/execute endpoint against the Bica v1.0 Spec.
 * 
 * Usage:
 *   $env:BICA_SHARED_SECRET = "dev_secret_keys"
 *   $env:EXTERNAL_USER_ID = "cmle84h17000br9db3rsb2iilq"
 *   node scripts/bica-test.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHARED_SECRET = process.env.BICA_SHARED_SECRET || 'dev_secret_keys';
// Real user ID for workspace scoping (verified in DB)
const USER_ID = process.env.EXTERNAL_USER_ID || 'cmle84h17000br9db3rsb2iilq';

async function sendRequest(payload, operationType, operationId = 'test-op-' + Date.now()) {
    const timestamp = new Date().toISOString();

    const body = {
        operation_type: operationType,
        operation_id: operationId,
        test_mode: true,
        timestamp: timestamp,
        user_context: {
            platform_entity_type: 'App\\Models\\User',
            platform_entity_id: USER_ID
        },
        payload: payload
    };

    const rawBody = JSON.stringify(body);
    const signature = crypto
        .createHmac('sha256', SHARED_SECRET)
        .update(rawBody)
        .digest('hex');

    console.log(`\n--- Testing ${operationType} ---`);
    console.log(`Payload: ${JSON.stringify(payload).slice(0, 100)}...`);

    const res = await fetch(`${BASE_URL}/api/bica/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Custom-Platform-Signature': signature
        },
        body: rawBody
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
        console.log(`✅ PASSED (${res.status})`);
        return data.data;
    } else {
        console.error(`❌ FAILED (${res.status})`);
        console.error(`   Error: ${JSON.stringify(data.error)}`);
        return null;
    }
}

async function runTests() {
    console.log('Starting Bica Platform Integration Tests...');
    console.log(`Target: ${BASE_URL}`);
    console.log(`User:   ${USER_ID}`);

    // 1. Test Lookup (JEQL)
    await sendRequest({
        query_lang: 'jeql',
        scope: 'Client',
        operations: {
            $limit: 5
        }
    }, 'lookup');

    // 2. Test Direct Lookup (Text search)
    await sendRequest({
        relationName: 'Client',
        queryText: 'Okafor'
    }, 'direct_lookup');

    // 3. Test Write (Crud Action)
    const writeResult = await sendRequest({
        action: 'Crud',
        parameterSets: [{
            action: 'create',
            parentEntityType: 'workspace',
            parentEntityId: 'current',
            data: {
                relationName: 'clients',
                definition: {
                    name: 'Bica Test Client ' + Date.now(),
                    email: 'test-' + Date.now() + '@example.com'
                }
            }
        }]
    }, 'write');

    if (writeResult && writeResult.results && writeResult.results[0].result.id) {
        const newId = writeResult.results[0].result.id;

        // 4. Test Preview
        await sendRequest({
            model: 'Client',
            ids: [newId]
        }, 'preview');

        // 5. Cleanup: Delete the test client
        await sendRequest({
            action: 'Crud',
            parameterSets: [{
                action: 'delete',
                parentEntityType: 'workspace',
                parentEntityId: 'current',
                data: {
                    scope: 'clients',
                    targetOperations: {
                        $whereAll: [['id', '=', newId]]
                    }
                }
            }]
        }, 'write');
    }

    // 6. Test Security - Invalid Signature
    const invalidRes = await fetch(`${BASE_URL}/api/bica/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Custom-Platform-Signature': 'invalid-sig'
        },
        body: JSON.stringify({ operation_type: 'lookup' })
    });
    if (invalidRes.status === 401) {
        console.log('\n--- Testing Invalid Signature ---');
        console.log('✅ PASSED (Expected 401)');
    } else {
        console.error('❌ FAILED: Expected 401 for invalid signature, got ' + invalidRes.status);
    }

    console.log('\nTests completed.');
}

runTests().catch(console.error);
