import { getSearchableFields, getModelKey } from '../src/lib/bica/search-config';

const testModels = [
  'Client',
  'Clients',
  'Matter',
  'Matters',
  'Brief',
  'Briefs',
  'Task',
  'Tasks',
  'Invoice',
  'Expense',
  'UnknownModel'
];

console.log('--- Search Config Verification ---');
testModels.forEach(model => {
  try {
    const key = getModelKey(model);
    const fields = getSearchableFields(model);
    console.log(`Input: "${model}" -> ModelKey: "${key}" -> Fields: [${fields.join(', ')}]`);
  } catch (err) {
    console.error(`Error processing model "${model}":`, err);
  }
});
console.log('---------------------------------');
