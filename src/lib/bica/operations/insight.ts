/**
 * InsightHandler
 *
 * Handles the `insight` operation type — Bica's analytics path.
 *
 * Bica compiles the user's natural-language analytics request into a SQL
 * SELECT statement (with optional named bindings). This handler:
 *   1. Validates the payload shape.
 *   2. Asserts the query is read-only (via `sql-safety.ts`).
 *   3. Applies a row-count cap so the demo doesn't return unbounded data.
 *   4. Converts `:param_name` style named bindings to PostgreSQL `$1` positional form.
 *   5. Executes the query directly via Prisma's raw query interface.
 *   6. Returns a structured { columns, rows, rowCount } response.
 *
 * ⚠️  V0 DEMO NOTICE — the following production concerns are declared below
 *     as stub methods and are intentionally NOT yet implemented:
 *       - Tenant scoping / row-level security injection
 *       - Read-only replica routing
 *       - Per-column result sanitization (scrubbing sensitive fields)
 *       - Query cost / timeout budgeting
 *     Each stub is marked with a TODO and must be filled in before V1 ships.
 *
 * Expected payload shape:
 *   {
 *     sql:       string;                  // compiled SQL from Bica
 *     bindings?: Record<string, unknown>; // named params e.g. { workspaceId: "..." }
 *   }
 *
 * Response shape:
 *   {
 *     columns:  string[];
 *     rows:     Record<string, unknown>[];
 *     rowCount: number;
 *   }
 */

import { prisma } from '@/lib/prisma';
import { BicaHandler } from '../handlers/base';
import { assertInsightQuerySafe, SqlSafetyError } from '../lib/sql-safety';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default maximum number of rows returned by an insight query.
 * Prevents the demo from inadvertently returning entire tables.
 * Pass `null` (or override `getRowLimit()`) to allow unlimited rows.
 */
const DEFAULT_ROW_LIMIT = 200;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export class InsightHandler extends BicaHandler {

  // --------------------------------------------------------------------------
  // Public entry point
  // --------------------------------------------------------------------------

  async handle(payload: any): Promise<any> {
    // Step 1 — Validate payload shape.
    const { sql, bindings } = this.validatePayload(payload);

    // Step 2 — Assert the query is read-only. Throws SqlSafetyError on violation.
    this.validateQuerySafety(sql);

    // Step 3 — Apply tenant scoping (STUB — no-op in V0).
    const scopedSql = await this.applyTenantScope(sql);

    // Step 4 — Inject a row-count cap if the computed limit is non-null.
    const limitedSql = this.injectRowLimit(scopedSql);

    // Step 5 — Convert :param_name → $1 positional form and collect values.
    const { processedSql, paramValues } = this.processBindings(limitedSql, bindings);

    // Step 6 — Execute against the database.
    const rawRows = await this.executeQuery(processedSql, paramValues);

    // Step 7 — Sanitize results (STUB — no-op in V0).
    const sanitizedRows = this.sanitizeResults(rawRows);

    // Step 8 — Build and return the structured response.
    return this.formatResponse(sanitizedRows);
  }

  // --------------------------------------------------------------------------
  // Step 1 · Payload validation
  // --------------------------------------------------------------------------

  /**
   * Validates the incoming payload and returns typed fields.
   * Only checks structure — not query semantics.
   */
  private validatePayload(payload: any): {
    sql: string;
    bindings: Record<string, unknown>;
  } {
    if (!payload || typeof payload !== 'object') {
      throw Object.assign(new Error('insight payload must be an object.'), {
        bicaCode: 'VALIDATION_ERROR',
      });
    }

    const { sql, bindings } = payload;

    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      throw Object.assign(
        new Error('insight payload requires a non-empty "sql" string.'),
        { bicaCode: 'VALIDATION_ERROR' },
      );
    }

    if (bindings !== undefined && (typeof bindings !== 'object' || Array.isArray(bindings) || bindings === null)) {
      throw Object.assign(
        new Error('"bindings" must be a plain object mapping param names to values.'),
        { bicaCode: 'VALIDATION_ERROR' },
      );
    }

    return {
      sql: sql.trim(),
      bindings: (bindings as Record<string, unknown>) ?? {},
    };
  }

  // --------------------------------------------------------------------------
  // Step 2 · SQL safety validation (delegates to sql-safety.ts)
  // --------------------------------------------------------------------------

  /**
   * Parses the SQL AST and rejects any non-SELECT statement type.
   * All safety rules live in `src/lib/bica/lib/sql-safety.ts`.
   */
  private validateQuerySafety(sql: string): void {
    try {
      assertInsightQuerySafe(sql);
    } catch (err: any) {
      if (err instanceof SqlSafetyError) {
        throw Object.assign(new Error(err.message), { bicaCode: 'VALIDATION_ERROR' });
      }
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Step 3 · Tenant scoping  (V0 STUB)
  // --------------------------------------------------------------------------

  /**
   * TODO (V1): Inject row-level security filters so queries are automatically
   * scoped to the current actor's workspace. Options include:
   *   - Prepending a CTE that restricts visible rows per tenant
   *   - Wrapping the query in a subquery with a WHERE workspaceId = $N clause
   *   - Routing to a tenant-isolated read-only schema
   *
   * For V0, the query is returned unchanged. The demo runs without scoping.
   */
  private async applyTenantScope(sql: string): Promise<string> {
    // TODO(V1): tenant scope injection
    return sql;
  }

  // --------------------------------------------------------------------------
  // Step 4 · Row limit injection
  // --------------------------------------------------------------------------

  /**
   * Returns the maximum number of rows this handler will return.
   * Override or set to `null` for unlimited rows (not recommended in production).
   *
   * This is a dedicated method so the limit policy is easy to locate,
   * override in tests, or make configurable per-request in V1.
   */
  protected getRowLimit(): number | null {
    return DEFAULT_ROW_LIMIT;
  }

  /**
   * Injects a LIMIT clause into the SQL if:
   *   - `getRowLimit()` returns a non-null value, AND
   *   - the SQL does not already contain a top-level LIMIT clause.
   *
   * The check for an existing LIMIT is intentionally simple (case-insensitive
   * token scan) — the safety parser above has already validated the SQL is
   * a well-formed SELECT, so false positives here are very unlikely.
   */
  private injectRowLimit(sql: string): string {
    const limit = this.getRowLimit();
    if (limit === null) return sql; // unlimited — caller's responsibility

    const hasLimit = /\blimit\b/i.test(sql);
    if (hasLimit) return sql; // respect the caller's explicit limit

    // Strip trailing semicolon (if any) before appending LIMIT.
    return sql.replace(/;\s*$/, '').trimEnd() + ` LIMIT ${limit}`;
  }

  // --------------------------------------------------------------------------
  // Step 5 · Named binding → positional binding conversion
  // --------------------------------------------------------------------------

  /**
   * Converts `:param_name` style named placeholders in SQL to PostgreSQL
   * positional `$1`, `$2`, ... form, and returns the ordered array of values.
   *
   * Rules:
   *   - Named params match the pattern `:identifier` (letter/digit/underscore).
   *   - The same name may appear multiple times; each occurrence gets a NEW
   *     positional slot pointing to the same value (PostgreSQL does not support
   *     reuse of the same `$N` across positions by name).
   *   - Params referenced in SQL but absent from `bindings` trigger a
   *     VALIDATION_ERROR so callers get an actionable message.
   *   - Keys present in `bindings` but never referenced in SQL are silently ignored.
   *
   * Example:
   *   sql      = "SELECT * FROM clients WHERE workspace_id = :workspaceId"
   *   bindings = { workspaceId: "clm123" }
   *   result   = { processedSql: "SELECT * FROM clients WHERE workspace_id = $1",
   *                paramValues:  ["clm123"] }
   */
  private processBindings(
    sql: string,
    bindings: Record<string, unknown>,
  ): { processedSql: string; paramValues: unknown[] } {
    const paramValues: unknown[] = [];
    let counter = 0;

    const processedSql = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name: string) => {
      if (!(name in bindings)) {
        throw Object.assign(
          new Error(
            `SQL binding ":${name}" is referenced in the query but was not provided in "bindings".`,
          ),
          { bicaCode: 'VALIDATION_ERROR' },
        );
      }
      paramValues.push(bindings[name]);
      counter += 1;
      return `$${counter}`;
    });

    return { processedSql, paramValues };
  }

  // --------------------------------------------------------------------------
  // Step 6 · Query execution
  // --------------------------------------------------------------------------

  /**
   * Executes the processed SQL against the primary database connection via
   * Prisma's `$queryRawUnsafe`. By this point the query has been:
   *   - Parsed and validated as a SELECT
   *   - Row-limited
   *   - Converted to positional bindings
   *
   * TODO(V1): Route to a dedicated read-only replica or connection pool
   *           instead of the primary Prisma instance.
   *
   * TODO(V1): Apply a per-query execution timeout / cost budget (e.g. via
   *           `SET statement_timeout = '5s'` in the same transaction).
   */
  private async executeQuery(sql: string, values: unknown[]): Promise<unknown[]> {
    try {
      const rows = await (prisma as any).$queryRawUnsafe(sql, ...values);
      return Array.isArray(rows) ? rows : [];
    } catch (err: any) {
      throw Object.assign(
        new Error(`Insight query execution failed: ${err?.message ?? err}`),
        { bicaCode: 'SERVER_ERROR' },
      );
    }
  }

  // --------------------------------------------------------------------------
  // Step 7 · Result sanitization  (V0 STUB)
  // --------------------------------------------------------------------------

  /**
   * TODO(V1): Scrub columns that must never be returned to Bica, for example:
   *   - Password hashes, MFA secrets, API key hashes
   *   - Internal audit metadata
   *   - Any column matching a configurable deny-list
   *
   * For V0, rows are returned as-is.
   */
  private sanitizeResults(rows: unknown[]): Record<string, unknown>[] {
    // TODO(V1): column deny-list scrubbing
    return rows as Record<string, unknown>[];
  }

  // --------------------------------------------------------------------------
  // Step 8 · Response formatting
  // --------------------------------------------------------------------------

  /**
   * Builds the canonical insight response object.
   *
   * `columns` is derived from the keys of the first row. An empty result set
   * returns an empty columns array — Bica should handle this gracefully.
   */
  private formatResponse(rows: Record<string, unknown>[]): {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  } {
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, rowCount: rows.length };
  }
}
