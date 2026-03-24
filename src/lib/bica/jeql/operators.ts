import { JeqlValidationError } from './errors';
import { JeqlOperator } from './types';
import { buildLikeFilter, parseDateValue } from './utils';

export function compileScalarOperator(operator: JeqlOperator, value: unknown): Record<string, unknown> {
  switch (operator) {
    case '=':
      return { equals: value };
    case '!=':
      return { not: value };
    case '>':
      return { gt: value };
    case '<':
      return { lt: value };
    case '>=':
      return { gte: value };
    case '<=':
      return { lte: value };
    case 'in':
      if (!Array.isArray(value)) {
        throw new JeqlValidationError('The in operator requires an array value.');
      }
      return { in: value };
    case 'not in':
      if (!Array.isArray(value)) {
        throw new JeqlValidationError('The not in operator requires an array value.');
      }
      return { notIn: value };
    case 'like':
      return buildLikeFilter(value);
    case 'json_contains':
      return { array_contains: value };
    case 'date>':
      return { gt: parseDateValue(value, 'date>') };
    case 'date<':
      return { lt: parseDateValue(value, 'date<') };
    case 'date>=':
      return { gte: parseDateValue(value, 'date>=') };
    case 'date<=':
      return { lte: parseDateValue(value, 'date<=') };
    case 'search':
    case 'date=':
    case 'date!=':
    case 'date_between':
      throw new JeqlValidationError(`The ${operator} operator is handled at the compiler layer.`);
    default:
      throw new JeqlValidationError(`Unsupported JEQL operator: ${operator}.`);
  }
}