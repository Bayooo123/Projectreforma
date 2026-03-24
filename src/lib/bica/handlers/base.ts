import { getPlaybook } from '../playbooks';
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
    // Use the target model's Playbook to obtain a scope filter based on
    // the current actor (platformEntity) and its type. This delegates
    // tenant/actor scoping to the model-specific Playbook.
    const playbook = getPlaybook(relationName);
    if (!playbook) throw new Error(`No playbook for relation: ${relationName}`);
    return playbook.getScopeFilter(platformEntity, platformEntityType);
  }
}
