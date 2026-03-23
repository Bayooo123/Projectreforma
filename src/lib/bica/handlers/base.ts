import { resolveRelationScope } from './utils';
import { BicaContext, BicaResponse } from './types';

export { type BicaContext, type BicaResponse };

export abstract class BicaHandler {
  protected context: BicaContext;

  constructor(context: BicaContext) {
    this.context = context;
  }

  abstract handle(payload: any): Promise<any>;

  /**
   * Resolves the polymorphic scope for a given relation name.
   */
  protected async resolveScope(relationName: string): Promise<any> {
    const { platformEntity, platformEntityType } = this.context;
    return resolveRelationScope(platformEntity, platformEntityType, relationName);
  }
}
