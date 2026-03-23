/**
 * Bica CRUD Execution Engine
 *
 * Processes Bica `Crud` parameterSets.
 * Scoping is resolved polymorphically: $platformEntity->$relationName()
 */

import { prisma } from '@/lib/prisma';
import { JEQLCompiler } from '@/lib/jeql/compiler';
import { JEQLQuery } from '@/lib/jeql/types';
import { BicaContext } from './handlers/types';
import { resolveRelationScope } from './handlers/utils';

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

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

function resolveDelegate(relationName: string): any {
    const modelKey = RELATION_TO_MODEL[relationName] || 
                     (relationName.toLowerCase().endsWith('s') ? RELATION_TO_MODEL[relationName.toLowerCase()] : null) ||
                     relationName.charAt(0).toLowerCase() + relationName.slice(1);
    
    const delegate = (prisma as any)[modelKey];
    if (!delegate) {
        throw new CrudError('VALIDATION_ERROR', `Unknown relation or model: '${relationName}'.`);
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
// Sub-action handlers
// ---------------------------------------------------------------------------

const compiler = new JEQLCompiler();

async function handleCreate(paramSet: CrudParameterSet, context: BicaContext): Promise<any> {
    const { relationName, definition } = paramSet.data;
    if (!relationName || typeof definition !== 'object') {
        throw new CrudError('VALIDATION_ERROR', 'create requires data.relationName and data.definition.');
    }

    const delegate = resolveDelegate(relationName);
    
    // For creation, we automatically inject the parent scoping if applicable
    // Note: $entity->$relation()->create() usually implies the entity's ID is the parent ID
    const scope = await resolveRelationScope(context.platformEntity, context.platformEntityType, relationName);

    const record = await delegate.create({
        data: {
            ...definition,
            ...scope,
        },
    });

    return { id: record.id, created: true, record };
}

async function handleCreateMany(paramSet: CrudParameterSet, context: BicaContext): Promise<any> {
    const { relationName, definition } = paramSet.data;
    if (!relationName || !Array.isArray(definition)) {
        throw new CrudError('VALIDATION_ERROR', 'createMany requires data.relationName and data.definition (array).');
    }

    const delegate = resolveDelegate(relationName);
    const scope = await resolveRelationScope(context.platformEntity, context.platformEntityType, relationName);

    const records = definition.map((def: any) => ({
        ...def,
        ...scope,
    }));

    const result = await delegate.createMany({ data: records });
    return { count: result.count, created: true };
}

async function handleRead(paramSet: CrudParameterSet, context: BicaContext): Promise<any> {
    const { scope, targetOperations } = paramSet.data;
    if (!scope) throw new CrudError('VALIDATION_ERROR', 'read requires data.scope.');

    const delegate = resolveDelegate(scope);
    const whereScope = await resolveRelationScope(context.platformEntity, context.platformEntityType, scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    jeqlArgs.where = { AND: [whereScope, jeqlArgs.where || {}] };

    const records = await delegate.findMany(jeqlArgs);
    return { records };
}

async function handleCount(paramSet: CrudParameterSet, context: BicaContext): Promise<any> {
    const { scope, targetOperations } = paramSet.data;
    if (!scope) throw new CrudError('VALIDATION_ERROR', 'count requires data.scope.');

    const delegate = resolveDelegate(scope);
    const whereScope = await resolveRelationScope(context.platformEntity, context.platformEntityType, scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    const result = await delegate.count({ 
        where: { AND: [whereScope, jeqlArgs.where || {}] } 
    });
    return { count: result };
}

async function handleUpdate(paramSet: CrudParameterSet, context: BicaContext): Promise<any> {
    const { scope, targetOperations, attributes } = paramSet.data;
    if (!scope || !attributes) throw new CrudError('VALIDATION_ERROR', 'update requires data.scope and data.attributes.');

    const delegate = resolveDelegate(scope);
    const whereScope = await resolveRelationScope(context.platformEntity, context.platformEntityType, scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    const result = await delegate.updateMany({
        where: { AND: [whereScope, jeqlArgs.where || {}] },
        data: attributes,
    });

    return { count: result.count, updated: true };
}

async function handleUpdateEach(paramSet: CrudParameterSet, context: BicaContext): Promise<any> {
    const { scope, targetOperations, attributes } = paramSet.data;
    if (!scope || !Array.isArray(attributes)) throw new CrudError('VALIDATION_ERROR', 'updateEach requires data.attributes (array).');

    const delegate = resolveDelegate(scope);
    const whereScope = await resolveRelationScope(context.platformEntity, context.platformEntityType, scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    const matches = await delegate.findMany({
        where: { AND: [whereScope, jeqlArgs.where || {}] },
        select: { id: true },
    });

    if (matches.length !== attributes.length) {
        throw new CrudError('VALIDATION_ERROR', `Attribute count mismatch. Expected ${matches.length}, got ${attributes.length}.`);
    }

    const updates = await Promise.all(
        matches.map(({ id }: any, index: number) =>
            delegate.update({ where: { id }, data: attributes[index] })
        )
    );

    return { count: updates.length, updated: true };
}

async function handleDelete(paramSet: CrudParameterSet, context: BicaContext): Promise<any> {
    const { scope, targetOperations } = paramSet.data;
    if (!scope) throw new CrudError('VALIDATION_ERROR', 'delete requires data.scope.');

    const delegate = resolveDelegate(scope);
    const whereScope = await resolveRelationScope(context.platformEntity, context.platformEntityType, scope);
    const jeqlArgs = compiler.compile((targetOperations || {}) as JEQLQuery);

    const result = await delegate.deleteMany({ 
        where: { AND: [whereScope, jeqlArgs.where || {}] } 
    });
    return { count: result.count, deleted: true };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export async function executeCrudParameterSet(
    paramSet: CrudParameterSet,
    context: BicaContext
): Promise<CrudResult> {
    const { action } = paramSet;
    let result: any;

    switch (action) {
        case 'create': result = await handleCreate(paramSet, context); break;
        case 'createMany': result = await handleCreateMany(paramSet, context); break;
        case 'read': result = await handleRead(paramSet, context); break;
        case 'count': result = await handleCount(paramSet, context); break;
        case 'update': result = await handleUpdate(paramSet, context); break;
        case 'updateEach': result = await handleUpdateEach(paramSet, context); break;
        case 'delete': result = await handleDelete(paramSet, context); break;
        default:
            throw new CrudError('VALIDATION_ERROR', `Unknown action: '${action}'.`);
    }

    return { action, result };
}

export async function executeCrudPayload(
    parameterSets: CrudParameterSet[],
    context: BicaContext
): Promise<CrudResult[]> {
    if (!Array.isArray(parameterSets) || parameterSets.length === 0) {
        throw new CrudError('VALIDATION_ERROR', 'Crud payload must have at least one parameterSet.');
    }
    const results: CrudResult[] = [];
    for (const paramSet of parameterSets) {
        results.push(await executeCrudParameterSet(paramSet, context));
    }
    return results;
}

