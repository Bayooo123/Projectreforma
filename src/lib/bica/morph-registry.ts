/**
 * Bica Platform — Morph Registry
 *
 * Maps `platform_entity_type` strings (snake_case singular, e.g. "user", "workspace")
 * to async resolver functions that load the corresponding Prisma entity by ID.
 *
 * Design principles:
 *  - Resolvers are intentionally minimal — they load the entity and nothing else.
 *  - Workspace scoping is the caller's responsibility, done separately after resolution.
 *  - Each new entity type gets one entry in the registry. No magic, no inference.
 */

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class UnknownMorphTypeError extends Error {
    constructor(type: string) {
        super(
            `Unknown platform_entity_type: "${type}". ` +
            `Registered types: ${Object.keys(REGISTRY).join(', ')}.`
        );
        this.name = 'UnknownMorphTypeError';
    }
}

export class MorphEntityNotFoundError extends Error {
    constructor(type: string, id: string) {
        super(`Entity of type "${type}" with id "${id}" was not found.`);
        this.name = 'MorphEntityNotFoundError';
    }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A raw Prisma record — the registry doesn't type the shape further. */
export type ResolvedEntity = Record<string, any>;

/** A function that loads a single entity by its ID. */
type MorphResolver = (id: string) => Promise<ResolvedEntity>;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REGISTRY: Record<string, MorphResolver> = {

    /**
     * "user" → prisma.user
     * The most common entity type. Represents an individual Reforma user.
     */
    user: async (id) => {
        const entity = await prisma.user.findUnique({ where: { id } });
        if (!entity) throw new MorphEntityNotFoundError('user', id);
        return entity;
    },

    /**
     * "workspace" → prisma.workspace
     * Represents the law firm / workspace itself.
     * Useful when an action is actor is the workspace, not an individual user.
     */
    workspace: async (id) => {
        const entity = await prisma.workspace.findUnique({ where: { id } });
        if (!entity) throw new MorphEntityNotFoundError('workspace', id);
        return entity;
    },

};

// ---------------------------------------------------------------------------
// MorphRegistry class
// ---------------------------------------------------------------------------

export class MorphRegistry {
    /**
     * Resolves a platform entity by type and ID.
     * Throws `UnknownMorphTypeError` if the type is not registered.
     * Throws `MorphEntityNotFoundError` if no record is found.
     */
    async resolve(type: string, id: string): Promise<ResolvedEntity> {
        const resolver = REGISTRY[type];
        if (!resolver) throw new UnknownMorphTypeError(type);
        return resolver(id);
    }

    /**
     * Returns all registered entity type keys.
     */
    registeredTypes(): string[] {
        return Object.keys(REGISTRY);
    }
}

/**
 * Shared singleton instance.
 */
export const morphRegistry = new MorphRegistry();
