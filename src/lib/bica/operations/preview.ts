import { BicaHandler } from '../handlers/base';
import { prisma } from '@/lib/prisma';
import { getPlaybook } from '../playbooks';

/**
 * PreviewHandler
 *
 * Fetches one or more records by ID and delegates HTML card rendering to each
 * model's Playbook via getPreviewHtml(). Relation data required by the card is
 * declared by the Playbook in getPreviewIncludes() and loaded in a single query.
 *
 * Expected payload shape:
 * { model: string, ids: string[] }
 *
 * Response shape:
 * { cards: Record<id, htmlString> }
 *
 * IDs that are not found (outside scope or deleted) are silently omitted from
 * the response — the caller should treat a missing key as "not accessible".
 */
export class PreviewHandler extends BicaHandler {
  async handle(payload: any): Promise<any> {
    const { model, ids } = payload ?? {};

    if (!model || typeof model !== 'string') {
      throw Object.assign(
        new Error('preview requires a "model" string.'),
        { bicaCode: 'VALIDATION_ERROR' },
      );
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      throw Object.assign(
        new Error('preview requires a non-empty "ids" array.'),
        { bicaCode: 'VALIDATION_ERROR' },
      );
    }

    const playbook = getPlaybook(model);
    if (!playbook) {
      throw Object.assign(
        new Error(`Unknown model: '${model}'.`),
        { bicaCode: 'VALIDATION_ERROR' },
      );
    }

    if (!playbook.isPreviewable()) {
      throw Object.assign(
        new Error(`Model '${model}' does not support previews.`),
        { bicaCode: 'VALIDATION_ERROR' },
      );
    }

    const delegate = (prisma as any)[playbook.modelKey];
    if (!delegate) {
      throw Object.assign(
        new Error(`No Prisma delegate found for model '${model}'.`),
        { bicaCode: 'SERVER_ERROR' },
      );
    }

    const whereScope = await this.resolveScope(model);
    const includes = playbook.getPreviewIncludes();
    const includeClause = Object.keys(includes).length > 0 ? { include: includes } : {};

    let records: any[];
    try {
      records = await delegate.findMany({
        where: { id: { in: ids }, ...whereScope },
        ...includeClause,
      });
    } catch (error: any) {
      throw Object.assign(
        new Error(`Failed to fetch preview records: ${error.message || error}`),
        { bicaCode: 'SERVER_ERROR' },
      );
    }

    const cards: Record<string, string> = {};
    for (const record of records) {
      cards[record.id] = playbook.getPreviewHtml(record);
    }

    return { cards };
  }
}
