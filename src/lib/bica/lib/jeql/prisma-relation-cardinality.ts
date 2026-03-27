import { Prisma } from '@prisma/client';

import { JeqlRelationCardinality } from './types';

const relationCardinalityCache = new Map<string, Record<string, JeqlRelationCardinality>>();

function normalizeModelName(modelKey: string): string {
  const trimmed = String(modelKey || '').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function getPrismaRelationCardinality(modelKey: string): Record<string, JeqlRelationCardinality> {
  const normalizedModelName = normalizeModelName(modelKey);
  if (!normalizedModelName) {
    return {};
  }

  const cached = relationCardinalityCache.get(normalizedModelName);
  if (cached) {
    return cached;
  }

  const model = Prisma.dmmf.datamodel.models.find(({ name }) => name === normalizedModelName);
  if (!model) {
    return {};
  }

  const cardinalityMap: Record<string, JeqlRelationCardinality> = {};

  for (const field of model.fields) {
    if (field.kind !== 'object') {
      continue;
    }

    cardinalityMap[field.name] = field.isList ? 'many' : 'one';
  }

  relationCardinalityCache.set(normalizedModelName, cardinalityMap);
  return cardinalityMap;
}
