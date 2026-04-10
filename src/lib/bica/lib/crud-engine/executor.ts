import { prisma } from '@/lib/prisma';
import { getPrismaRelationMetadata, JeqlCompiler, JeqlQuery, JeqlValidationError } from '../jeql';
import { CrudExecutionError, CrudValidationError } from './errors';
import { DefinitionCompiler } from './definition-compiler';
import {
  CrudAction,
  CrudContext,
  CrudCountData,
  CrudCreateData,
  CrudCreateManyData,
  CrudDeleteData,
  CrudParameterSet,
  CrudReadData,
  CrudResult,
  CrudUpdateData,
  CrudUpdateEachData,
} from './types';
import { assertNonEmptyString, requireDelegate, requirePlaybook } from './utils';
import { normalizePlaybookKey } from '../../playbooks';

type ResolvedParentEntity = {
  entity: any;
  playbook: any;
  entityType: string;
  entityId: string;
};

/**
 * Executes a batch of CRUD payloads against Prisma using playbook metadata.
 */
export class CrudExecutor {
  private readonly jeql = new JeqlCompiler();

  private readonly definitions = new DefinitionCompiler();

  constructor(private readonly context: CrudContext) {}

  /**
   * Executes a batch sequentially so later operations can safely depend on
   * earlier ones when a payload intentionally chains related writes.
   */
  async executeBatch(parameterSets: CrudParameterSet[]): Promise<CrudResult[]> {
    if (!Array.isArray(parameterSets)) {
      throw new CrudValidationError('parameterSets must be an array.');
    }

    const results: CrudResult[] = [];
    for (const parameterSet of parameterSets) {
      results.push(await this.execute(parameterSet));
    }

    return results;
  }

  /**
   * Executes a single CRUD parameter set.
   */
  async execute(parameterSet: CrudParameterSet): Promise<CrudResult> {
    if (!parameterSet || typeof parameterSet !== 'object') {
      throw new CrudValidationError('Each parameterSet must be an object.');
    }

    const action = parameterSet.action as CrudAction;
    const data: any = parameterSet.data;
    const parentContext = await this.resolveParentEntity(parameterSet.parentEntityType, parameterSet.parentEntityId);

    switch (action) {
      case 'create':
        return this.create(data, parentContext);
      case 'createMany':
        return this.createMany(data, parentContext);
      case 'read':
        return this.read(data, parentContext);
      case 'count':
        return this.count(data, parentContext);
      case 'update':
        return this.update(data, parentContext);
      case 'updateEach':
        return this.updateEach(data, parentContext);
      case 'delete':
        return this.delete(data, parentContext);
      default:
        throw new CrudValidationError(`Unsupported CRUD action '${String(action)}'.`);
    }
  }

  /**
   * Creates one record and compiles any nested create definitions.
   */
  private async create(data: CrudCreateData, parentContext: ResolvedParentEntity): Promise<CrudResult> {
    const relationName = assertNonEmptyString(data?.relationName, 'relationName');
    const definition = this.requireDefinition(data?.definition, 'definition');
    this.assertRelationAllowed(parentContext.playbook, relationName, 'write');
    const playbook = requirePlaybook(relationName, 'relationName');
    const delegate = requireDelegate(prisma, playbook.modelKey, `relationName '${relationName}'`);
    const modelName = playbook.getModelName();

    const payload = await this.definitions.compile(playbook.modelKey, definition, parentContext.entity, parentContext.entityType);

    try {
      const record = await delegate.create({ data: payload });
      return {
        created: true,
        _model: modelName,
        record: record ? { ...record, _model: modelName } : record,
        id: record?.id,
      };
    } catch (error: any) {
      throw this.wrapExecutionError('create', error);
    }
  }

  /**
   * Creates multiple records in one call.
   */
  private async createMany(data: CrudCreateManyData, parentContext: ResolvedParentEntity): Promise<CrudResult> {
    const relationName = assertNonEmptyString(data?.relationName, 'relationName');
    const definitions = Array.isArray(data?.definition) ? data.definition : null;

    if (!definitions || definitions.length === 0) {
      throw new CrudValidationError('createMany requires a non-empty definition array.');
    }

    this.assertRelationAllowed(parentContext.playbook, relationName, 'write');
    const playbook = requirePlaybook(relationName, 'relationName');
    const delegate = requireDelegate(prisma, playbook.modelKey, `relationName '${relationName}'`);
    const modelName = playbook.getModelName();

    try {
      const records = await Promise.all(
        definitions.map(async definition => {
          if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
            throw new CrudValidationError('Each createMany definition must be an object.');
          }

          const compiledDefinition = await this.definitions.compile(
            playbook.modelKey,
            definition as Record<string, unknown>,
            parentContext.entity,
            parentContext.entityType
          );
          return delegate.create({
            data: compiledDefinition,
          });
        })
      );

      return {
        created: true,
        _model: modelName,
        count: records.length,
        records: records.map(record => ({ ...record, _model: modelName })),
      };
    } catch (error: any) {
      if (error instanceof CrudValidationError) {
        throw error;
      }
      throw this.wrapExecutionError('createMany', error);
    }
  }

  /**
   * Runs a JEQL read query with the current actor scope merged in.
   */
  private async read(data: CrudReadData, parentContext: ResolvedParentEntity): Promise<CrudResult> {
    const { delegate, baseWhere, playbook } = this.resolveScopedDelegate(data?.scope, parentContext, 'read');
    const query = this.requireJeqlQuery(data?.targetOperations, 'targetOperations');
    const { relationCardinality, relationFieldMap } = getPrismaRelationMetadata(playbook.modelKey);

    try {
      const compiled = this.jeql.compile(query, { baseWhere, relationCardinality, relationFieldMap, modelKey: playbook.modelKey });
      const records = await delegate.findMany(compiled);
      return { records };
    } catch (error: any) {
      throw this.wrapQueryError('read', error);
    }
  }

  /**
   * Counts rows that match a JEQL query.
   */
  private async count(data: CrudCountData, parentContext: ResolvedParentEntity): Promise<CrudResult> {
    const { delegate, baseWhere, playbook } = this.resolveScopedDelegate(data?.scope, parentContext, 'read');
    const query = this.requireJeqlQuery(data?.targetOperations ?? {}, 'targetOperations');
    const { relationCardinality, relationFieldMap } = getPrismaRelationMetadata(playbook.modelKey);

    try {
      const compiled = this.jeql.compile(query, { baseWhere, relationCardinality, relationFieldMap, modelKey: playbook.modelKey });
      const count = await delegate.count({ where: compiled.where });
      return { count };
    } catch (error: any) {
      throw this.wrapQueryError('count', error);
    }
  }

  /**
   * Applies the same attribute patch to all matching rows.
   */
  private async update(data: CrudUpdateData, parentContext: ResolvedParentEntity): Promise<CrudResult> {
    const { delegate, baseWhere, playbook } = this.resolveScopedDelegate(data?.scope, parentContext, 'write');
    const query = this.requireJeqlQuery(data?.targetOperations, 'targetOperations');
    const attributes = this.requirePlainObject(data?.attributes, 'attributes');
    const modelName = playbook.getModelName();
    const { relationCardinality, relationFieldMap } = getPrismaRelationMetadata(playbook.modelKey);

    if ('$select' in query) {
      throw new CrudValidationError('$select is not allowed for update operations.');
    }

    try {
      const compiled = this.jeql.compile(query, { baseWhere, relationCardinality, relationFieldMap, modelKey: playbook.modelKey });
      const result = await delegate.updateMany({
        where: compiled.where,
        data: attributes,
      });

      return { updated: true, _model: modelName, count: result?.count ?? 0 };
    } catch (error: any) {
      throw this.wrapQueryError('update', error);
    }
  }

  /**
   * Updates each matched record with the corresponding attributes object.
   */
  private async updateEach(data: CrudUpdateEachData, parentContext: ResolvedParentEntity): Promise<CrudResult> {
    const { delegate, baseWhere, playbook } = this.resolveScopedDelegate(data?.scope, parentContext, 'write');
    const query = this.requireJeqlQuery(data?.targetOperations, 'targetOperations');
    const attributesList = Array.isArray(data?.attributes) ? data.attributes : null;
    const modelName = playbook.getModelName();
    const { relationCardinality, relationFieldMap } = getPrismaRelationMetadata(playbook.modelKey);

    if (!query.$orderBy || query.$orderBy.length === 0) {
      throw new CrudValidationError('updateEach requires $orderBy so row-to-row alignment is deterministic.');
    }

    if (!attributesList || attributesList.length === 0) {
      throw new CrudValidationError('updateEach requires a non-empty attributes array.');
    }

    try {
      const compiled = this.jeql.compile(query, { baseWhere, relationCardinality, relationFieldMap, modelKey: playbook.modelKey });
      const records = await delegate.findMany({
        where: compiled.where,
        orderBy: compiled.orderBy,
        take: compiled.take,
        skip: compiled.skip,
        select: { id: true },
      });

      if (records.length !== attributesList.length) {
        throw new CrudValidationError(
          `updateEach expected ${records.length} attribute objects to match the selected rows, but received ${attributesList.length}.`
        );
      }

      const updatedRecords = [];
      for (let index = 0; index < records.length; index += 1) {
        const row = records[index];
        const patch = attributesList[index];

        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
          throw new CrudValidationError('Each updateEach attributes entry must be an object.');
        }

        // Update each record individually so each row can receive its own
        // payload while preserving the order established by $orderBy.
        const updated = await delegate.update({
          where: { id: row.id },
          data: patch,
        });
        updatedRecords.push({ ...updated, _model: modelName });
      }

      return { updated: true, _model: modelName, count: updatedRecords.length, records: updatedRecords };
    } catch (error: any) {
      throw this.wrapQueryError('updateEach', error);
    }
  }

  /**
   * Deletes every row that matches the JEQL filter.
   */
  private async delete(data: CrudDeleteData, parentContext: ResolvedParentEntity): Promise<CrudResult> {
    const { delegate, baseWhere, playbook } = this.resolveScopedDelegate(data?.scope, parentContext, 'write');
    const query = this.requireJeqlQuery(data?.targetOperations, 'targetOperations');
    const { relationCardinality, relationFieldMap } = getPrismaRelationMetadata(playbook.modelKey);

    if ('$select' in query) {
      throw new CrudValidationError('$select is not allowed for delete operations.');
    }

    try {
      const compiled = this.jeql.compile(query, { baseWhere, relationCardinality, relationFieldMap, modelKey: playbook.modelKey });
      const result = await delegate.deleteMany({ where: compiled.where });
      return { deleted: true, count: result?.count ?? 0 };
    } catch (error: any) {
      throw this.wrapQueryError('delete', error);
    }
  }

  /**
   * Resolves a model delegate and merges the actor scope for query actions.
   */
  private resolveScopedDelegate(
    scope: string,
    parentContext: ResolvedParentEntity,
    relationKind: 'read' | 'write'
  ): { delegate: any; baseWhere: Record<string, unknown>; playbook: any } {
    const normalizedScope = assertNonEmptyString(scope, 'scope');
    this.assertRelationAllowed(parentContext.playbook, normalizedScope, relationKind);
    const playbook = requirePlaybook(normalizedScope, 'scope');
    const delegate = requireDelegate(prisma, playbook.modelKey, `scope '${normalizedScope}'`);
    const baseWhere = playbook.getScopeFilter(parentContext.entity, parentContext.entityType);

    if (!baseWhere || typeof baseWhere !== 'object' || Array.isArray(baseWhere)) {
      throw new CrudValidationError(`Playbook '${normalizedScope}' returned an invalid scope filter.`);
    }

    return { delegate, baseWhere, playbook };
  }

  /**
   * Validates that a query object is plain JSON-like data.
   */
  private requireJeqlQuery(value: unknown, label: string): JeqlQuery {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new CrudValidationError(`${label} must be an object.`);
    }

    return value as JeqlQuery;
  }

  /**
   * Ensures an input value is a plain object.
   */
  private requirePlainObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new CrudValidationError(`${label} must be a plain object.`);
    }

    return value as Record<string, unknown>;
  }

  /**
   * Validates that create payloads are plain objects.
   */
  private requireDefinition(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new CrudValidationError(`${label} must be a plain object.`);
    }

    return value as Record<string, unknown>;
  }

  /**
   * Resolves the parent entity before any CRUD action is executed.
   */
  private async resolveParentEntity(parentEntityType: unknown, parentEntityId: unknown): Promise<ResolvedParentEntity> {
    const entityType = assertNonEmptyString(parentEntityType, 'parentEntityType');
    const entityId = assertNonEmptyString(parentEntityId, 'parentEntityId');
    const playbook = requirePlaybook(entityType, 'parentEntityType');
    const entity = await playbook.resolve(entityId);

    return { entity, playbook, entityType, entityId };
  }

  /**
   * Ensures the requested relation exists on the resolved parent playbook.
   */
  private assertRelationAllowed(parentPlaybook: any, relationName: string, relationKind: 'read' | 'write'): void {
    const allowedRelations = relationKind === 'write'
      ? parentPlaybook.getMutableChildRelationships()
      : parentPlaybook.getChildRelationships();

    const normalizedRelation = String(relationName || '').trim().toLowerCase();
    const isAllowed = Array.isArray(allowedRelations)
      && allowedRelations.some((relation: string) => normalizePlaybookKey(relation) === normalizePlaybookKey(normalizedRelation));

    if (!isAllowed) {
      throw new CrudValidationError(
        `Relation '${relationName}' is not available on parent model '${parentPlaybook.modelKey}'. Allowed relations: ${JSON.stringify(allowedRelations || [])}.`
      );
    }
  }

  /**
   * Wraps JEQL validation and runtime errors in CRUD-specific failures.
   */
  private wrapQueryError(operation: string, error: any): Error {
    if (error instanceof CrudValidationError) {
      return error;
    }

    if (error instanceof JeqlValidationError) {
      return new CrudValidationError(error.message);
    }

    return new CrudExecutionError(`Failed to execute CRUD ${operation}: ${error?.message || error}`);
  }

  /**
   * Wraps create/update/delete runtime errors in a consistent server error.
   */
  private wrapExecutionError(operation: string, error: any): Error {
    if (error instanceof CrudValidationError) {
      return error;
    }

    return new CrudExecutionError(`Failed to execute CRUD ${operation}: ${error?.message || error}`);
  }
}
