
import { PrismaClient } from '@prisma/client';
import { InsightHandler } from '../src/lib/bica/operations/insight';
import { DirectLookupHandler } from '../src/lib/bica/operations/direct-lookup';
import { LookupHandler } from '../src/lib/bica/operations/lookup';
import { WriteHandler } from '../src/lib/bica/operations/write';

const prisma = new PrismaClient();

async function runTests() {
  const workspaceId = 'cmlteuiz40003ym902kk2jhfv'; // O.J. & CO Legal Practitioners
  
  // Create a mock context
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    console.error('Workspace not found');
    return;
  }

  const context = {
    platformEntity: workspace,
    platformEntityType: 'workspace',
    requestId: 'test-request-' + Date.now(),
  };

  console.log('--- TESTING INSIGHT OPERATION ---');
  const insight = new InsightHandler(context);
  try {
    // Scenario 1: Count briefs (Should be scoped to workspaceId)
    console.log('Scenario 1: Count all briefs');
    const result1 = await insight.handle({
      sql: 'SELECT count(*) as total FROM {{Brief}}',
      bindings: {}
    });
    console.log('Result:', JSON.stringify(result1, null, 2));
    
    // Check actual count in DB for this workspace
    const actualCount = await prisma.brief.count({ where: { workspaceId } });
    const reportedCount = Number(result1.rows[0].total);
    console.log(`Reported: ${reportedCount}, Actual (scoped): ${actualCount}`);
    if (reportedCount !== actualCount) {
      console.warn('❌ FAILURE: Insight count is NOT scoped to workspace!');
    } else {
      console.log('✅ SUCCESS: Insight count is correctly scoped.');
    }

    // Scenario 2: Sum all expenses (Verify normalization of Decimal)
    console.log('\nScenario 2: Sum all expenses');
    // Ensure at least one expense exists for testing normalization
    const testExpense = await prisma.expense.create({
        data: {
            workspaceId,
            amount: 500000, // 5000 NGN
            description: 'Normalization Test',
            category: 'MISCELLANEOUS',
            date: new Date()
        }
    });

    const result2 = await insight.handle({
      sql: 'SELECT sum(amount) as total FROM {{Expense}}',
      bindings: {}
    });
    console.log('Result:', JSON.stringify(result2, null, 2));
    
    await prisma.expense.delete({ where: { id: testExpense.id } });

    if (typeof result2.rows[0].total !== 'number') {
      console.warn('❌ FAILURE: Expense sum is NOT normalized to a number! Type is: ' + typeof result2.rows[0].total);
    } else {
      console.log('✅ SUCCESS: Expense sum (Decimal) is correctly normalized to a number.');
    }

  } catch (e: any) {
    console.error('Insight Error:', e.message);
  }

  console.log('\n--- TESTING WRITE OPERATION ---');
  const writer = new WriteHandler(context);
  try {
    console.log('Scenario 3: Create a Brief');
    const result3 = await writer.handle({
      action: 'Crud', // Fixed: requires action wrapper
      parameterSets: [{
        action: 'create',
        parentEntityType: 'workspace',
        parentEntityId: workspaceId,
        data: {
          relationName: 'brief',
          definition: {
            name: 'BICA Integration Test Brief ' + Date.now(),
            category: 'LITIGATION',
            status: 'active'
          }
        }
      }]
    });
    console.log('Result:', JSON.stringify(result3, null, 2));
    if (result3 && result3.results && result3.results[0] && result3.results[0].created) {
      console.log('✅ SUCCESS: Brief created successfully via WRITE handler.');
      // Cleanup
      await prisma.brief.delete({ where: { id: result3.results[0].id } });
      console.log('Cleanup: Deleted test brief.');
    } else {
      console.warn('❌ FAILURE: Brief creation failed.');
    }
  } catch (e: any) {
    console.error('Write Error:', e.message);
  }

  console.log('\n--- TESTING DIRECT LOOKUP ---');
  const directLookup = new DirectLookupHandler(context);
  try {
    const result = await directLookup.handle({
      relationName: 'brief',
      queryText: 'test'
    });
    // console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Direct Lookup Result: [Truncated]');
  } catch (e: any) {
    console.error('Direct Lookup Error:', e.message);
  }

  await prisma.$disconnect();
}

runTests().catch(console.error);
