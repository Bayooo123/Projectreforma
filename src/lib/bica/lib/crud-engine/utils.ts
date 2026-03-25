import { getPlaybook } from '../../playbooks';
import { CrudValidationError } from './errors';

/**
 * Returns true when the value is a non-null object and not an array.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Ensures the provided string-like value is a meaningful identifier.
 */
export function assertNonEmptyString(value: unknown, label: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new CrudValidationError(`${label} must be a non-empty string.`);
  }
  return normalized;
}

/**
 * Normalizes relationship names for matching against playbook metadata.
 */
export function normalizeKey(value: string): string {
  return String(value || '').trim().toLowerCase();
}

/**
 * Throws when a playbook cannot be resolved for the supplied name.
 */
export function requirePlaybook(name: string, label: string) {
  const playbook = getPlaybook(name);
  if (!playbook) {
    throw new CrudValidationError(`Unknown ${label}: '${name}'. No playbook is registered for this model.`);
  }
  return playbook;
}

/**
 * Ensures an object has a Prisma delegate-like property on the imported client.
 */
export function requireDelegate(prismaClient: unknown, modelKey: string, label: string): any {
  const delegate = (prismaClient as Record<string, unknown>)[modelKey];
  if (!delegate) {
    throw new CrudValidationError(`No Prisma delegate found for ${label} '${modelKey}'.`);
  }
  return delegate;
}

/**
 * Detects whether a relation key should be treated as a nested create payload.
 */
export function isRelationshipKey(key: string, candidateRelationships: string[]): boolean {
  const normalizedKey = normalizeKey(key);
  return candidateRelationships.some(candidate => normalizeKey(candidate) === normalizedKey);
}
