import { JeqlValidationError } from './errors';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasKeys(value: Record<string, unknown> | undefined): value is Record<string, unknown> {
  return Boolean(value && Object.keys(value).length > 0);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function ensureArray<T>(value: T[] | undefined, label: string): T[] {
  if (!value) return [];
  if (!Array.isArray(value)) {
    throw new JeqlValidationError(`${label} must be an array.`);
  }
  return value;
}

export function assertFieldName(field: string): string {
  const trimmed = String(field || '').trim();
  if (!trimmed) {
    throw new JeqlValidationError('JEQL field names cannot be empty.');
  }
  if (trimmed.includes('.')) {
    throw new JeqlValidationError(`Dot notation is not supported in JEQL field filters: "${trimmed}".`);
  }
  return trimmed;
}

export function parsePositiveInteger(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new JeqlValidationError(`${label} must be a non-negative integer.`);
  }
  return value;
}

export function parseDateValue(value: unknown, label: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new JeqlValidationError(`${label} must be a valid date.`);
  }
  return parsed;
}

export function toUtcDayRange(value: unknown, label: string): { start: Date; end: Date } {
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
      end: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
    };
  }

  const date = parseDateValue(value, label);
  return {
    start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)),
    end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)),
  };
}

export function toDateBoundary(value: unknown, side: 'start' | 'end', label: string): Date {
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return side === 'start'
      ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }

  return parseDateValue(value, label);
}

export function toDateRange(value: unknown, label: string): { start: Date; end: Date } {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new JeqlValidationError(`${label} must be a two-item date range.`);
  }

  const start = toDateBoundary(value[0], 'start', `${label}[0]`);
  const end = toDateBoundary(value[1], 'end', `${label}[1]`);

  if (start.getTime() > end.getTime()) {
    throw new JeqlValidationError(`${label} start date cannot be after the end date.`);
  }

  return { start, end };
}

export function buildLikeFilter(pattern: unknown): Record<string, unknown> {
  if (!isNonEmptyString(pattern)) {
    throw new JeqlValidationError('The like operator requires a non-empty string pattern.');
  }

  const value = pattern.trim();
  const startsWithWildcard = value.startsWith('%');
  const endsWithWildcard = value.endsWith('%');
  const inner = value.replace(/^%+|%+$/g, '');

  if (!inner) {
    throw new JeqlValidationError('The like operator pattern cannot be only wildcards.');
  }

  if (startsWithWildcard && endsWithWildcard) {
    return { contains: inner, mode: 'insensitive' };
  }
  if (startsWithWildcard) {
    return { endsWith: inner, mode: 'insensitive' };
  }
  if (endsWithWildcard) {
    return { startsWith: inner, mode: 'insensitive' };
  }

  return { equals: inner, mode: 'insensitive' };
}

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function uniqueTokens(value: string): string[] {
  return Array.from(new Set(normalizeText(value).split(' ').filter(Boolean)));
}

export function buildSearchFragments(field: string, rawTerm: unknown): Record<string, unknown>[] {
  if (!isNonEmptyString(rawTerm)) {
    throw new JeqlValidationError('The search operator requires a non-empty string term.');
  }

  const term = rawTerm.trim();
  const tokens = uniqueTokens(term);
  const fragments = [{ [field]: { contains: term, mode: 'insensitive' } }];

  for (const token of tokens) {
    fragments.push({ [field]: { contains: token, mode: 'insensitive' } });
  }

  return fragments;
}
