/**
 * sql-safety.ts
 *
 * SQL safety validation for the Bica insight operation.
 *
 * This module is the single place where query safety is enforced.
 * It uses `node-sql-parser` to build a real AST and check statement
 * types — no regex heuristics.
 *
 * Allowed:  SELECT statements, including CTEs (WITH ... SELECT) and JOINs.
 * Rejected: Any statement that mutates state or structure:
 *           INSERT, UPDATE, DELETE, MERGE, TRUNCATE, DROP, CREATE,
 *           ALTER, RENAME, REPLACE, CALL, EXEC, GRANT, REVOKE, etc.
 *
 * Usage:
 *   import { assertInsightQuerySafe } from '@/lib/bica/lib/sql-safety';
 *   assertInsightQuerySafe(sql); // throws SqlSafetyError if unsafe
 */

import { Parser, type AST } from 'node-sql-parser';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class SqlSafetyError extends Error {
  public readonly bicaCode = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'SqlSafetyError';
  }
}

// ---------------------------------------------------------------------------
// Statement types considered safe (read-only)
// ---------------------------------------------------------------------------

/**
 * The set of AST statement types that are safe to execute on the read path.
 * `node-sql-parser` normalises these to lower-case strings on `ast.type`.
 */
const SAFE_STATEMENT_TYPES = new Set<string>([
  'select',
  // CTEs resolve to a 'select' type with a `with` array — included above.
  // EXPLAIN and SHOW are excluded intentionally (verbose, leaks schema info).
]);

// ---------------------------------------------------------------------------
// Core validation
// ---------------------------------------------------------------------------

let _parser: Parser | null = null;

/** Lazy singleton so we only construct the parser once. */
function getParser(): Parser {
  if (!_parser) _parser = new Parser();
  return _parser;
}

/**
 * Parse `sql` and assert that every statement it contains is a read-only
 * SELECT (including CTEs). Throws `SqlSafetyError` on any violation.
 *
 * Multiple statements separated by semicolons are each checked independently
 * so a `SELECT 1; DROP TABLE foo` compound is always rejected.
 *
 * @param sql Raw SQL string as received from Bica.
 * @throws {SqlSafetyError} if the query contains unsafe statements.
 * @throws {SqlSafetyError} if the query cannot be parsed at all.
 */
export function assertInsightQuerySafe(sql: string): void {
  if (!sql || typeof sql !== 'string') {
    throw new SqlSafetyError('SQL query must be a non-empty string.');
  }

  let ast: AST | AST[];
  try {
    // Use PostgreSQL dialect to match our database engine.
    ast = getParser().astify(sql, { database: 'PostgresQL' });
  } catch (err: any) {
    throw new SqlSafetyError(
      `SQL could not be parsed: ${err?.message ?? 'unknown parse error'}.`,
    );
  }

  // `astify` returns a single AST node or an array when multiple statements
  // are present. Normalise to an array so we can inspect each one.
  const statements: AST[] = Array.isArray(ast) ? ast : [ast];

  for (const stmt of statements) {
    const type = String(stmt?.type ?? '').toLowerCase();
    if (!SAFE_STATEMENT_TYPES.has(type)) {
      throw new SqlSafetyError(
        `Unsafe SQL statement type "${type.toUpperCase()}" is not permitted in insight queries. ` +
          'Only SELECT statements (including CTEs and JOINs) are allowed.',
      );
    }
  }
}
