/**
 * Bica CRUD Execution Engine
 *
 * Processes a single `Crud` parameterSet from a Bica write operation.
 * All operations are scoped to a workspace identified by `workspaceId`.
 */

import { prisma } from '@/lib/prisma';
import { JEQLCompiler } from '@/lib/jeql/compiler';
import { JEQLQuery } from '@/lib/jeql/types';

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

/**
 * Maps the `relationName` (camelCase plural) used in Bica payloads to the
 * Prisma model delegate key (camelCase singular).
 *
 * The Bica spec sends relationName in camelCase plural form (e.g. "clients",
 * "matters", "calendarEntries"). Prisma delegates are singular.
 */
const RELATION_TO_MODEL: Record<string, string> = {
    clients: 'client',
    matters: 'matter',
    briefs: 'brief',
    tasks: 'task',
    invoices: 'invoice',
    payments: 'payment',
    calendarEntries: 'calendarEntry',
    meetingRecordings: 'meetingRecording',
    complianceTasks: 'complianceTask',
    draftingTemplates: 'draftingTemplate',
    documents: 'document',
};

/**
 * Resolves a relation name to the Prisma delegate.
 * Throws if the relation is not in the registry.
 */
function resolveDelegate(relationName: string): any {
    const modelKey = RELATION_TO_MODEL[relationName];
    if (!modelKey) {
        throw new CrudError(
            'VALIDATION_ERROR',
            `Unknown relationName '${relationName}'. Allowed: ${Object.keys(RELATION_TO_MODEL).join(', ')}`
        );
    }
    const delegate = (prisma as any)[modelKey];
    if (!delegate) {
        throw new CrudError('SERVER_ERROR', `Prisma delegate for '${modelKey}' is undefined.`);
    }
    return delegate;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class CrudError extends Error {
    code: string;
    constructor(code: string, message: string) {
        super(message);
        this.name = 'CrudError';
        this.code = code;
    }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrudParameterSet {
    action: 'create' | 'createMany' | 'read' | 'count' | 'update' | 'updateEach' | 'delete';
    parentEntityType: string;
    parentEntityId: string;
    data: Record<string, any>;
}

export interface CrudResult {
    action: string;
    result: any;
}

// ---------------------------------------------------------------------------
// Workspace scope helper
// ---------------------------------------------------------------------------

/**
 * Returns the workspaceId constraint to apply to every query.
 * All top-level Reforma entities are owned by a Workspace.
 */
function workspaceConstraint(workspaceId: string) {
    return { workspaceId };
}

// ---------------------------------------------------------------------------
// Sub-action handlers
// ---------------------------------------------------------------------------

const compiler = new JEQLCompiler();

/**
 * create — inserts a single new record under the parent.
 *
 * data:
 *   - relationName (string) : the child relationship to create in
 *   - definition  (object)  : field values for the new record
 */
async function handleCreate(paramSet: CrudParameterSet, workspaceId: string): Promise<any> {
    const { relationName, definition } = paramSet.data;
    if (!relationName || typeof definition !== 'object') {
        throw new CrudError('VALIDATION_ERROR', 'create requires data.relationName (string) and data.definition (object).');
    }

    const delegate = resolveDelegate(relationName);

    const record = await delegate.create({
        data: {
            ...definition,
            ...workspaceConstraint(workspaceId),
        },
    });

    return {
        id: record.id,
        created: true,
        record,
    };
}

/**
 * createMany — inserts multiple records under the parent.
 *
 * data:
 *   - relationName (string)   : the child relationship to create in
 *   - definition  (object[])  : array of field value objects
 */
async function handleCreateMany(paramSet: CrudParameterSet, workspaceId: string): Promise<any> {
    const { relationName, definition } = paramSet.data;
    if (!relationName || !Array.isArray(definition)) {
        throw new CrudError('VALIDATION_ERROR', 'createMany requires data.relationName (string) and data.definition (array).');
    }

    const delegate = resolveDelegate(relationName);

    const records = definition.map((def: any) => ({
        ...def,
        ...workspaceConstraint(workspaceId),
    }));

    const result = await delegate.createMany({ data: records });

    return {
        count: result.count,
        created: true,
    };
}

/**
 * read — fetches records using JEQL targetOperations.
 *
 * data:
 *   - scope            (string) : relation/model to query
 *   - targetOperations (object) : JEQL query
 */
async function handleRead(paramSet: CrudParameterSet, workspaceId: string): Promise<any> {
    const { scope, targetOperations } = paramSet.data;
    if (!scope) {
        throw new CrudError('VALIDATION_ERROR', 'read requires data.scope (string).');
    }

    const delegate = resolveDelegate(scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    // Always inject workspace scoping into the where clause
    jeqlArgs.where = {
        ...jeqlArgs.where,
        ...workspaceConstraint(workspaceId),
    };

    const records = await delegate.findMany(jeqlArgs);
    return { records };
}

/**
 * count — counts records matching JEQL targetOperations.
 *
 * data:
 *   - scope            (string)  : relation/model to count
 *   - targetOperations (object?) : JEQL query (filter only)
 */
async function handleCount(paramSet: CrudParameterSet, workspaceId: string): Promise<any> {
    const { scope, targetOperations } = paramSet.data;
    if (!scope) {
        throw new CrudError('VALIDATION_ERROR', 'count requires data.scope (string).');
    }

    const delegate = resolveDelegate(scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    // count only uses 'where'
    const countWhere = {
        ...(jeqlArgs.where || {}),
        ...workspaceConstraint(workspaceId),
    };

    const total = await delegate.count({ where: countWhere });
    return { count: total };
}

/**
 * update — applies the same attributes to all records matching the JEQL query.
 *
 * data:
 *   - scope            (string) : relation/model to update
 *   - targetOperations (object) : JEQL conditions to identify targets
 *   - attributes       (object) : column values to apply
 */
async function handleUpdate(paramSet: CrudParameterSet, workspaceId: string): Promise<any> {
    const { scope, targetOperations, attributes } = paramSet.data;
    if (!scope || typeof attributes !== 'object' || Array.isArray(attributes)) {
        throw new CrudError('VALIDATION_ERROR', 'update requires data.scope, data.targetOperations, and data.attributes (object).');
    }

    const delegate = resolveDelegate(scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    const updateWhere = {
        ...(jeqlArgs.where || {}),
        ...workspaceConstraint(workspaceId),
    };

    const result = await delegate.updateMany({
        where: updateWhere,
        data: attributes,
    });

    return { count: result.count, updated: true };
}

/**
 * updateEach — applies a corresponding attributes object per matched record (one-to-one).
 *
 * data:
 *   - scope            (string)   : relation/model to update
 *   - targetOperations (object)   : JEQL conditions to identify targets
 *   - attributes       (object[]) : array of attribute objects, one per matched record
 */
async function handleUpdateEach(paramSet: CrudParameterSet, workspaceId: string): Promise<any> {
    const { scope, targetOperations, attributes } = paramSet.data;
    if (!scope || !Array.isArray(attributes)) {
        throw new CrudError('VALIDATION_ERROR', 'updateEach requires data.scope, data.targetOperations, and data.attributes (array).');
    }

    const delegate = resolveDelegate(scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    const matchWhere = {
        ...(jeqlArgs.where || {}),
        ...workspaceConstraint(workspaceId),
    };

    // Fetch IDs of matching records
    const matches = await delegate.findMany({
        where: matchWhere,
        select: { id: true },
    });

    if (matches.length !== attributes.length) {
        throw new CrudError(
            'VALIDATION_ERROR',
            `updateEach: attributes array length (${attributes.length}) does not match matched records (${matches.length}).`
        );
    }

    const updates = await Promise.all(
        matches.map(({ id }: { id: string }, index: number) =>
            delegate.update({
                where: { id },
                data: attributes[index],
            })
        )
    );

    return { count: updates.length, updated: true };
}

/**
 * delete — deletes all records matching the JEQL query.
 *
 * data:
 *   - scope            (string) : relation/model to delete from
 *   - targetOperations (object) : JEQL conditions to identify targets
 */
async function handleDelete(paramSet: CrudParameterSet, workspaceId: string): Promise<any> {
    const { scope, targetOperations } = paramSet.data;
    if (!scope) {
        throw new CrudError('VALIDATION_ERROR', 'delete requires data.scope (string) and data.targetOperations.');
    }

    const delegate = resolveDelegate(scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    const deleteWhere = {
        ...(jeqlArgs.where || {}),
        ...workspaceConstraint(workspaceId),
    };

    const result = await delegate.deleteMany({ where: deleteWhere });
    return { count: result.count, deleted: true };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

/**
 * Executes one Crud parameterSet and returns the result.
 * Throws CrudError on any validation failure or unsupported action.
 */
export async function executeCrudParameterSet(
    paramSet: CrudParameterSet,
    workspaceId: string
): Promise<CrudResult> {
    const { action } = paramSet;

    let result: any;

    switch (action) {
        case 'create': result = await handleCreate(paramSet, workspaceId); break;
        case 'createMany': result = await handleCreateMany(paramSet, workspaceId); break;
        case 'read': result = await handleRead(paramSet, workspaceId); break;
        case 'count': result = await handleCount(paramSet, workspaceId); break;
        case 'update': result = await handleUpdate(paramSet, workspaceId); break;
        case 'updateEach': result = await handleUpdateEach(paramSet, workspaceId); break;
        case 'delete': result = await handleDelete(paramSet, workspaceId); break;
        default:
            throw new CrudError('VALIDATION_ERROR', `Unknown Crud sub-action: '${action}'.`);
    }

    return { action, result };
}

/**
 * Processes an entire Crud payload (up to 5 parameterSets) sequentially.
 */
export async function executeCrudPayload(
    parameterSets: CrudParameterSet[],
    workspaceId: string
): Promise<CrudResult[]> {
    if (!Array.isArray(parameterSets) || parameterSets.length === 0) {
        throw new CrudError('VALIDATION_ERROR', 'Crud payload must have at least one parameterSet.');
    }
    if (parameterSets.length > 5) {
        throw new CrudError('VALIDATION_ERROR', `Crud payload exceeds max parameterSets limit of 5.`);
    }

    const results: CrudResult[] = [];
    for (const paramSet of parameterSets) {
        results.push(await executeCrudParameterSet(paramSet, workspaceId));
    }
    return results;
}
