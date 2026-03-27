import { Prisma } from '@prisma/client';

import { JeqlRelationCardinality } from './types';

const relationCardinalityCache = new Map<string, Record<string, JeqlRelationCardinality>>();
const relationFieldMapCache = new Map<string, Record<string, string>>();
const scalarFieldMapCache = new Map<string, Record<string, string>>();

type PrismaRelationMetadata = {
  relationCardinality: Record<string, JeqlRelationCardinality>;
  relationFieldMap: Record<string, string>;
  scalarFieldMap: Record<string, string>;
};

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function snakeToCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
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
    return { relationCardinality: {}, relationFieldMap: {}, scalarFieldMap: {} };
  }

  const cachedCardinality = relationCardinalityCache.get(normalizedModelName);
  const cachedFieldMap = relationFieldMapCache.get(normalizedModelName);
  const cachedScalarFieldMap = scalarFieldMapCache.get(normalizedModelName);
  if (cachedCardinality && cachedFieldMap && cachedScalarFieldMap) {
    return { relationCardinality: cachedCardinality, relationFieldMap: cachedFieldMap, scalarFieldMap: cachedScalarFieldMap };
  }

  const model = Prisma.dmmf.datamodel.models.find(({ name }) => name === normalizedModelName);
  if (!model) {
    return { relationCardinality: {}, relationFieldMap: {}, scalarFieldMap: {} };
  }

  const relationFields = model.fields.filter(field => field.kind === 'object');
  const cardinalityMap: Record<string, JeqlRelationCardinality> = {};
  const fieldMap: Record<string, string> = {};
  const scalarFieldMap: Record<string, string> = {};
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

  for (const field of model.fields) {
    if (field.kind === 'object') {
      continue;
    }

    scalarFieldMap[field.name] = field.name;
    scalarFieldMap[field.name.toLowerCase()] = field.name;
    scalarFieldMap[snakeToCamelCase(field.name)] = field.name;
  }

  relationCardinalityCache.set(normalizedModelName, cardinalityMap);
  relationFieldMapCache.set(normalizedModelName, fieldMap);
  scalarFieldMapCache.set(normalizedModelName, scalarFieldMap);

  return { relationCardinality: cardinalityMap, relationFieldMap: fieldMap, scalarFieldMap };
}

export function resolveFieldName(modelKey: string, fieldName: string): string {
  const { scalarFieldMap } = getPrismaRelationMetadata(modelKey);
  if (!scalarFieldMap) {
    return fieldName;
  }

  return scalarFieldMap[fieldName] ?? scalarFieldMap[fieldName.toLowerCase()] ?? scalarFieldMap[snakeToCamelCase(fieldName)] ?? fieldName;
}
