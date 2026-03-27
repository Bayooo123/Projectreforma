import { JeqlValidationError } from './errors';
import { compileScalarOperator } from './operators';
import {
  JeqlCompileOptions,
  JeqlCompiledQuery,
  JeqlCondition,
  JeqlQuery,
  JeqlRelationCardinality,
  JeqlRelationQueryMap,
  JeqlSimpleCondition,
} from './types';
import {
  assertFieldName,
  buildSearchFragments,
  ensureArray,
  hasKeys,
  isPlainObject,
  parsePositiveInteger,
  toDateRange,
  toUtcDayRange,
} from './utils';

export class JeqlCompiler {
  compile(query: JeqlQuery, options: JeqlCompileOptions = {}): JeqlCompiledQuery {
    this.assertQueryShape(query);

    if (query.$withSemanticMatches !== undefined) {
      throw new JeqlValidationError('$withSemanticMatches is not supported by the Prisma-backed JEQL compiler yet.');
    }

    const compiled: JeqlCompiledQuery = {};
    const where = this.compileWhere(query, options.baseWhere, options.relationCardinality, options.relationFieldMap);
    const projection = this.compileProjection(query, options.relationFieldMap);
    const orderBy = this.compileOrderBy(query.$orderBy);
    const take = parsePositiveInteger(query.$limit, '$limit');
    const skip = parsePositiveInteger(query.$offset, '$offset');

    if (where) compiled.where = where;
    if (projection.select) compiled.select = projection.select;
    if (projection.include) compiled.include = projection.include;
    if (orderBy.length > 0) compiled.orderBy = orderBy;
    if (take !== undefined) compiled.take = take;
    if (skip !== undefined) compiled.skip = skip;

    return compiled;
  }

  private assertQueryShape(query: JeqlQuery): void {
    if (!isPlainObject(query)) {
      throw new JeqlValidationError('JEQL query must be an object.');
    }
  }

  private compileWhere(
    query: JeqlQuery,
    baseWhere?: Record<string, unknown>,
    relationCardinality?: Record<string, JeqlRelationCardinality>,
    relationFieldMap?: Record<string, string>
  ): Record<string, unknown> | undefined {
    const parts: Record<string, unknown>[] = [];

    if (hasKeys(baseWhere)) {
      parts.push(baseWhere);
    }

    const allConditions = ensureArray(query.$whereAll, '$whereAll');
    const anyConditions = ensureArray(query.$whereAny, '$whereAny');

    if (allConditions.length > 0) {
      parts.push(this.compileConditionGroup(allConditions, 'AND'));
    }
    if (anyConditions.length > 0) {
      parts.push(this.compileConditionGroup(anyConditions, 'OR'));
    }
    if (query.$whereHas) {
      parts.push(this.compileRelationMap(query.$whereHas, 'has', relationCardinality, relationFieldMap));
    }
    if (query.$whereNotHas) {
      parts.push(this.compileRelationMap(query.$whereNotHas, 'notHas', relationCardinality, relationFieldMap));
    }

    if (parts.length === 0) {
      return undefined;
    }
    if (parts.length === 1) {
      return parts[0];
    }
    return { AND: parts };
  }

  private compileConditionGroup(conditions: JeqlCondition[], logic: 'AND' | 'OR'): Record<string, unknown> {
    const compiled = conditions.map(condition => this.compileCondition(condition));
    if (compiled.length === 1) {
      return compiled[0];
    }
    return { [logic]: compiled };
  }

  private compileCondition(condition: JeqlCondition): Record<string, unknown> {
    if (Array.isArray(condition)) {
      return this.compileSimpleCondition(condition);
    }
    if (isPlainObject(condition) && '$whereAll' in condition) {
      return this.compileConditionGroup(ensureArray(condition.$whereAll, '$whereAll'), 'AND');
    }
    if (isPlainObject(condition) && '$whereAny' in condition) {
      return this.compileConditionGroup(ensureArray(condition.$whereAny, '$whereAny'), 'OR');
    }
    throw new JeqlValidationError('Invalid JEQL condition structure.');
  }

  private compileSimpleCondition(condition: JeqlSimpleCondition): Record<string, unknown> {
    const [fieldSelector, operator, value] = condition;

    if (Array.isArray(fieldSelector)) {
      if (operator !== 'search') {
        throw new JeqlValidationError('Only the search operator supports multi-column field selectors.');
      }

      const fields = fieldSelector.map(field => assertFieldName(field));
      return {
        OR: fields.flatMap(field => buildSearchFragments(field, value)),
      };
    }

    const field = assertFieldName(fieldSelector);

    if (operator === 'search') {
      return {
        OR: buildSearchFragments(field, value),
      };
    }

    if (operator === 'date=') {
      const { start, end } = toUtcDayRange(value, `date= for ${field}`);
      return { [field]: { gte: start, lte: end } };
    }

    if (operator === 'date!=') {
      const { start, end } = toUtcDayRange(value, `date!= for ${field}`);
      return {
        OR: [
          { [field]: { lt: start } },
          { [field]: { gt: end } },
        ],
      };
    }

    if (operator === 'date_between') {
      const { start, end } = toDateRange(value, `date_between for ${field}`);
      return { [field]: { gte: start, lte: end } };
    }

    return { [field]: compileScalarOperator(operator, value) };
  }

  private compileRelationMap(
    relations: JeqlRelationQueryMap,
    mode: 'has' | 'notHas',
    relationCardinality?: Record<string, JeqlRelationCardinality>,
    relationFieldMap?: Record<string, string>
  ): Record<string, unknown> {
    if (!isPlainObject(relations)) {
      throw new JeqlValidationError(`${mode === 'has' ? '$whereHas' : '$whereNotHas'} must be an object keyed by relation name.`);
    }

    const compiled = Object.entries(relations).map(([relation, subQuery]) => {
      const relationName = this.resolveRelationFieldName(relation, relationFieldMap);
      const where = this.compileWhere(subQuery, undefined, relationCardinality, relationFieldMap);
      const relationOperator = this.resolveRelationOperator(mode, relationName, relationCardinality);

      return {
        [relationName]: {
          [relationOperator]: where ?? {},
        },
      };
    });

    if (compiled.length === 1) {
      return compiled[0];
    }

    return { AND: compiled };
  }

  private resolveRelationOperator(
    mode: 'has' | 'notHas',
    relationName: string,
    relationCardinality?: Record<string, JeqlRelationCardinality>
  ): 'some' | 'none' | 'is' | 'isNot' {
    const cardinality = relationCardinality?.[relationName];

    if (cardinality === 'one') {
      return mode === 'has' ? 'is' : 'isNot';
    }

    return mode === 'has' ? 'some' : 'none';
  }

  private resolveRelationFieldName(relation: string, relationFieldMap?: Record<string, string>): string {
    const relationName = assertFieldName(relation);
    if (!relationFieldMap) {
      return relationName;
    }

    return relationFieldMap[relationName] ?? relationFieldMap[relationName.toLowerCase()] ?? relationName;
  }

  private compileProjection(query: JeqlQuery, relationFieldMap?: Record<string, string>): Pick<JeqlCompiledQuery, 'select' | 'include'> {
    const selectFields = Array.isArray(query.$select) ? query.$select.filter(Boolean) : [];
    const withRelations = query.$with && isPlainObject(query.$with) ? query.$with : undefined;
    const hasScalarSelect = selectFields.length > 0;
    const hasWithRelations = Boolean(withRelations && Object.keys(withRelations).length > 0);

    if (!hasScalarSelect && !hasWithRelations) {
      return {};
    }

    if (!hasScalarSelect && withRelations) {
      return {
        include: Object.fromEntries(
          Object.entries(withRelations).map(([relation, subQuery]) => [this.resolveRelationFieldName(relation, relationFieldMap), this.compileRelationQuery(subQuery)])
        ),
      };
    }

    const select: Record<string, unknown> = Object.fromEntries(
      selectFields.map(field => [assertFieldName(field), true])
    );

    if (withRelations) {
      for (const [relation, subQuery] of Object.entries(withRelations)) {
        select[this.resolveRelationFieldName(relation, relationFieldMap)] = this.compileRelationQuery(subQuery);
      }
    }

    return { select };
  }

  private compileRelationQuery(query: JeqlQuery): true | Record<string, unknown> {
    const where = this.compileWhere(query);
    const projection = this.compileProjection(query);
    const orderBy = this.compileOrderBy(query.$orderBy);
    const take = parsePositiveInteger(query.$limit, '$limit');
    const skip = parsePositiveInteger(query.$offset, '$offset');

    const compiled: Record<string, unknown> = {};
    if (where) compiled.where = where;
    if (projection.select) compiled.select = projection.select;
    if (projection.include) compiled.include = projection.include;
    if (orderBy.length > 0) compiled.orderBy = orderBy;
    if (take !== undefined) compiled.take = take;
    if (skip !== undefined) compiled.skip = skip;

    return Object.keys(compiled).length > 0 ? compiled : true;
  }

  private compileOrderBy(orderBy: JeqlQuery['$orderBy']): Array<Record<string, 'asc' | 'desc'>> {
    const entries = ensureArray(orderBy, '$orderBy');
    return entries.map(entry => {
      if (!Array.isArray(entry) || entry.length !== 2) {
        throw new JeqlValidationError('$orderBy entries must be [field, direction] tuples.');
      }

      const [field, direction] = entry;
      if (direction !== 'asc' && direction !== 'desc') {
        throw new JeqlValidationError(`Invalid JEQL order direction: ${direction}.`);
      }

      return { [assertFieldName(field)]: direction };
    });
  }
}
