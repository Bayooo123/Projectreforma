import { BicaHandler } from '../handlers/base';
import { executeCrudPayload, CrudParameterSet } from '@/lib/bica/crud-engine';

export class WriteHandler extends BicaHandler {
  async handle(payload: any): Promise<any> {
    const { action, parameterSets } = payload;

    if (action !== 'Crud') {
      throw Object.assign(
        new Error(`Unsupported write action '${action}'. Only 'Crud' is supported.`),
        { bicaCode: 'VALIDATION_ERROR' }
      );
    }
    if (!Array.isArray(parameterSets)) {
      throw Object.assign(new Error('write payload must include a "parameterSets" array.'), { bicaCode: 'VALIDATION_ERROR' });
    }

    // We pass the context (platformEntity/Type) down to the CRUD engine
    // so it can handle polymorphic scoping internally.
    const results = await executeCrudPayload(
      parameterSets as CrudParameterSet[], 
      this.context
    );

    return { results };
  }
}
