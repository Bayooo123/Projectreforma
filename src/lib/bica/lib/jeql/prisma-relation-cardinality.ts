import { Prisma } from '@prisma/client';

import { JeqlRelationCardinality } from './types';

const relationCardinalityCache = new Map<string, Record<string, JeqlRelationCardinality>>();
const relationFieldMapCache = new Map<string, Record<string, string>>();

type PrismaRelationMetadata = {
  relationCardinality: Record<string, JeqlRelationCardinality>;
  relationFieldMap: Record<string, string>;
};

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function normalizeModelName(modelKey: string): string {
  const trimmed = String(modelKey || '').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function getPrismaRelationCardinality(modelKey: string): Record<string, JeqlRelationCardinality> {
  return getPrismaRelationMetadata(modelKey).relationCardinality;
}

export function getPrismaRelationMetadata(modelKey: string): PrismaRelationMetadata {
  const normalizedModelName = normalizeModelName(modelKey);
  if (!normalizedModelName) {
    return { relationCardinality: {}, relationFieldMap: {} };
  }

  const cachedCardinality = relationCardinalityCache.get(normalizedModelName);
  const cachedFieldMap = relationFieldMapCache.get(normalizedModelName);
  if (cachedCardinality && cachedFieldMap) {
    return { relationCardinality: cachedCardinality, relationFieldMap: cachedFieldMap };
  }

  const model = Prisma.dmmf.datamodel.models.find(({ name }) => name === normalizedModelName);
  if (!model) {
    return { relationCardinality: {}, relationFieldMap: {} };
  }

  const relationFields = model.fields.filter(field => field.kind === 'object');
  const cardinalityMap: Record<string, JeqlRelationCardinality> = {};
  const fieldMap: Record<string, string> = {};
  const relationTypeCounts = relationFields.reduce<Record<string, number>>((counts, field) => {
    counts[field.type] = (counts[field.type] ?? 0) + 1;
    return counts;
  }, {});

  for (const field of relationFields) {
    cardinalityMap[field.name] = field.isList ? 'many' : 'one';

    // Accept relation keys in multiple forms (e.g. briefs, Briefs, briefs, Brief).
    fieldMap[field.name] = field.name;
    fieldMap[field.name.toLowerCase()] = field.name;
    fieldMap[capitalize(field.name)] = field.name;

    // Only map model-type aliases when unambiguous on this model.
    if (relationTypeCounts[field.type] === 1) {
      fieldMap[field.type] = field.name;
      fieldMap[field.type.toLowerCase()] = field.name;
    }
  }

  relationCardinalityCache.set(normalizedModelName, cardinalityMap);
  relationFieldMapCache.set(normalizedModelName, fieldMap);

  return { relationCardinality: cardinalityMap, relationFieldMap: fieldMap };
}
