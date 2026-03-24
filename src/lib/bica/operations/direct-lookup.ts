import { BicaHandler } from '../handlers/base';
import { prisma } from '@/lib/prisma';
import { getPlaybook } from '../playbooks';

/**
 * DirectLookupHandler
 *
 * Performs a text-based search against a polymorphic relation using the
 * model playbook to decide which fields are searchable and how to label
 * results. This handler performs the DB query and then applies a simple
 * post-hoc confidence scoring algorithm across the playbook's searchable fields.
 */
export class DirectLookupHandler extends BicaHandler {
  /**
   * Handle an incoming direct_lookup payload.
   *
   * Expected payload shape:
   * { relationName: string, queryText: string }
   */
  async handle(payload: any): Promise<any> {
    // Laravel: $relation = $request->input('relationName'); $term = $request->input('queryText');
    const { relationName, queryText } = payload;

    if (!relationName || typeof queryText !== 'string') {
      throw Object.assign(
        new Error('direct_lookup requires "relationName" and "queryText".'),
        { bicaCode: 'VALIDATION_ERROR' }
      );
    }

    // Resolve the playbook for the requested relation name. Playbooks
    // centralize configuration (searchable fields, labels) for each model.
    const playbook = getPlaybook(relationName);
    if (!playbook) {
      throw Object.assign(new Error(`Unknown relationName: '${relationName}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    // Resolve the polymorphic scope for the platform entity. This returns
    // a Prisma `where` fragment representing the actor's scope (e.g. a
    // workspaceId filter or user-scoped filters) so queries respect tenant
    // and actor boundaries.
    const whereScope = await this.resolveScope(relationName);

    // Resolve Prisma delegate for the model key provided by the playbook.
    // Example: playbook.modelKey === 'client' => prisma.client
    const delegate = (prisma as any)[playbook.modelKey];

    if (!delegate) {
      throw Object.assign(new Error(`Unknown relationName: '${relationName}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    // Normalise input.
    const term = String(queryText || '').trim();

    // Ask the playbook which fields are searchable for this model.
    // Ensure the array is non-empty (fallback to `name`).
    const searchableFields = (playbook.getSearchableFields() || []).filter(Boolean);
    if (searchableFields.length === 0) searchableFields.push('name');

    // Build Prisma search conditions: a case-insensitive "contains" match
    // across each searchable field. Combined later with the actor scope.
    const searchConditions = searchableFields.map(field => ({
      [field]: { contains: term, mode: 'insensitive' }
    }));

    // Merge relation scope into the query so results are constrained to
    // what the actor is allowed to see (workspace scoping, user scoping, etc.).
    const finalWhere = {
      AND: [whereScope, { OR: searchConditions }]
    };

    // Execute the query (Laravel: $records = $query->take(20)->get();)
    // Execute the database query with a safe try/catch. We cap the results
    // with `take: 20` to avoid returning excessive rows for a single lookup.
    let records: any[] = [];
    try {
      records = await delegate.findMany({ where: finalWhere, take: 20 });
    } catch (err: any) {
      // Wrap lower-level errors in a Bica-aware error code so the caller
      // receives a structured `SERVER_ERROR` response rather than a raw stack.
      throw Object.assign(new Error(`Failed to execute direct lookup: ${err.message || err}`), { bicaCode: 'SERVER_ERROR' });
    }

    // Score each record after retrieval using a lightweight similarity
    // function. The scoring is intentionally simple and runs in-memory so
    // we do not rely on specialized DB full-text features. Scores are
    // clamped to [0,1] and results are returned sorted by confidence.
    const scoredRecords = records
      .map((record: any) => ({
        record,
        // Ensure the result is a number in [0,1].
        confidence: Math.max(0, Math.min(1, this.calculateConfidence(term, record, searchableFields) || 0)),
      }))
      .sort((left, right) => right.confidence - left.confidence);

    return {
      matches: scoredRecords.map(({ record, confidence }) => ({
        id: record.id,
        label: playbook.getLookupLabel(record),
        secondaryLabel: playbook.getLookupSecondaryLabel(record),
        confidence,
      })),
    };
  }

  /**
   * Calculate a normalized confidence score in [0,1] for how well
   * `queryText` matches fields on the given `record`.
   *
   * The algorithm:
   * - Normalize query and field values (lowercase, strip punctuation)
   * - For each searchable field, compute a similarity score
   *   using `compareText` and keep the best (max) score.
   * - Return the best score rounded to 3 decimals.
   */
  private calculateConfidence(queryText: string, record: any, searchableFields: string[]): number {
    const normalizedQuery = this.normalizeText(queryText);
    if (!normalizedQuery) return 0;

    let bestScore = 0;
    for (const field of searchableFields) {
      // Normalize the field value and skip empty values.
      const fieldValue = this.normalizeText(record?.[field]);
      if (!fieldValue) continue;

      // Compare normalized query against normalized field value.
      bestScore = Math.max(bestScore, this.compareText(normalizedQuery, fieldValue));
    }

    // Return score rounded to 3 decimal places for compactness.
    return Number(bestScore.toFixed(3));
  }

  /**
   * Compare two normalized strings and return a similarity score in [0,1].
   *
   * - Exact match => 1.0
   * - Substring containment (one includes the other) => 0.6..1.0 scaled
   *   by the length ratio (shorter/longer). This gives partial credit when
   *   one value is an abbreviated form of the other.
   * - Token overlap => Jaccard similarity of token sets (intersection/union).
   *
   * The function is intentionally simple and deterministic.
   */
  private compareText(left: string, right: string): number {
    if (!left || !right) return 0;
    if (left === right) return 1;

    // If one string contains the other, give a boosted partial score.
    if (left.includes(right) || right.includes(left)) {
      const shorter = Math.min(left.length, right.length);
      const longer = Math.max(left.length, right.length);

      // Base 0.6 plus up to 0.4 proportional to length similarity.
      return Number((0.6 + (shorter / longer) * 0.4).toFixed(3));
    }

    // Token-based similarity (Jaccard).
    const leftTokens = new Set(left.split(' ').filter(Boolean));
    const rightTokens = new Set(right.split(' ').filter(Boolean));

    if (!leftTokens.size || !rightTokens.size) return 0;

    let intersection = 0;
    for (const token of leftTokens) {
      if (rightTokens.has(token)) intersection += 1;
    }

    const union = new Set([...leftTokens, ...rightTokens]).size;
    return Number((intersection / union).toFixed(3));
  }

  /**
   * Normalize arbitrary input to a simple token string:
   * - coerce to string
   * - lowercase
   * - replace non-alphanumerics with spaces
   * - trim and collapse multiple spaces
   *
   * This normalization ensures the simple compareText/tokenization logic
   * behaves predictably across user input and stored DB values.
   */
  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }
}
