export { CrudValidationError, CrudExecutionError } from './errors';
export { CrudExecutor } from './executor';
export type {
  CrudAction,
  CrudContext,
  CrudParameterData,
  CrudParameterSet,
  CrudResult,
} from './types';

import { CrudExecutor } from './executor';
import type { CrudContext, CrudParameterSet, CrudResult } from './types';

/**
 * Executes a CRUD batch using the current Bica execution context.
 */
export async function executeCrudPayload(parameterSets: CrudParameterSet[], context: CrudContext): Promise<CrudResult[]> {
  const executor = new CrudExecutor(context);
  return executor.executeBatch(parameterSets);
}
