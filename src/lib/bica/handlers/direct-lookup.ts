import { BicaHandler } from './base';
import { prisma } from '@/lib/prisma';
import { getSearchableFields, getModelKey } from '@/lib/bica/search-config';
import { getRecordLabel, getRecordSecondaryLabel } from './label-config';

export class DirectLookupHandler extends BicaHandler {
  async handle(payload: any): Promise<any> {
    // Laravel: $relation = $request->input('relationName'); $term = $request->input('queryText');
    const { relationName, queryText } = payload;

    if (!relationName || typeof queryText !== 'string') {
      throw Object.assign(
        new Error('direct_lookup requires "relationName" and "queryText".'),
        { bicaCode: 'VALIDATION_ERROR' }
      );
    }

    // Resolve the polymorphic scope (Laravel: $query = $platformEntity->{$relationName}();)
    const whereScope = await this.resolveScope(relationName);

    // Resolve scope -> Prisma model key (Laravel: $model = Relation::getMorphedModel($relationName);)
    const modelKey = getModelKey(relationName);
    const delegate = (prisma as any)[modelKey];

    if (!delegate) {
      throw Object.assign(new Error(`Unknown relationName: '${relationName}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    const term = queryText.trim();
    const searchableFields = getSearchableFields(modelKey);

    // Map search fields to Prisma conditions (Laravel: $query->where(fn($q) => $q->orWhere('field', 'like', "%$term%")...))
    const searchConditions = searchableFields.map(field => ({
      [field]: { contains: term, mode: 'insensitive' }
    }));

    // Merge relation scope into the query (Laravel: $query->where($searchConditions);)
    const finalWhere = {
      AND: [whereScope, { OR: searchConditions }]
    };

    // Execute the query (Laravel: $records = $query->take(20)->get();)
    const records = await delegate.findMany({
      where: finalWhere,
      take: 20
    });


    return {
      matches: records.map((r: any) => ({
        id: r.id,
        label: getRecordLabel(modelKey, r),
        secondaryLabel: getRecordSecondaryLabel(modelKey, r),
        confidence: 0.9,
      })),
    };
  }
}
