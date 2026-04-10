import { getPlaybook } from '../../playbooks';
import { CrudValidationError } from './errors';
import { isPlainObject, isRelationshipKey } from './utils';

/**
 * Compiles a hierarchical definition object into a Prisma create payload.
 *
 * The compiler preserves scalar fields as-is and converts nested relationship
 * keys into Prisma `create` envelopes recursively.
 */
export class DefinitionCompiler {
  /**
   * Compiles a create definition for a specific model.
   */
  async compile(modelName: string, definition: Record<string, unknown>, parentEntity: any, parentEntityType: string): Promise<Record<string, unknown>> {
    const playbook = getPlaybook(modelName);
    if (!playbook) {
      throw new CrudValidationError(`Unknown model '${modelName}' while compiling nested create definitions.`);
    }

    return this.compileForPlaybook(playbook.modelKey, definition, parentEntity, parentEntityType);
  }

  private async compileForPlaybook(modelName: string, definition: Record<string, unknown>, parentEntity: any, parentEntityType: string): Promise<Record<string, unknown>> {
    const playbook = getPlaybook(modelName);
    if (!playbook) {
      throw new CrudValidationError(`Unknown model '${modelName}' while compiling nested create definitions.`);
    }

    const compiled: Record<string, unknown> = {
      ...(await playbook.getCreateScope(parentEntity, parentEntityType)),
    };
    const nestedRelationships = playbook.getMutableChildRelationships();

    for (const [key, value] of Object.entries(definition)) {
      if (isRelationshipKey(key, nestedRelationships)) {
        const childPlaybook = getPlaybook(key);
        if (!childPlaybook) {
          throw new CrudValidationError(
            `Nested relation '${key}' on '${modelName}' does not have a registered playbook, so recursive create cannot continue.`
          );
        }

        // Nested creates are intentionally recursive so the caller can pass a
        // natural tree of data and let the engine emit Prisma's create syntax.
        compiled[key] = Array.isArray(value)
          ? { create: await Promise.all(value.map(item => this.ensureNestedDefinition(item, key, parentEntity, parentEntityType))) }
          : { create: await this.ensureNestedDefinition(value, key, parentEntity, parentEntityType) };
        continue;
      }

      compiled[key] = value;
    }

    return compiled;
  }

  private async ensureNestedDefinition(value: unknown, relationName: string, parentEntity: any, parentEntityType: string): Promise<Record<string, unknown>> {
    if (!isPlainObject(value)) {
      throw new CrudValidationError(`Nested relation '${relationName}' must be an object or an array of objects.`);
    }

    return this.compileForPlaybook(relationName, value, parentEntity, parentEntityType);
  }
}
