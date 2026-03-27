export const JEQL_OPERATORS = [
  '=',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'in',
  'not in',
  'like',
  'search',
  'json_contains',
  'date>',
  'date<',
  'date>=',
  'date<=',
  'date=',
  'date!=',
  'date_between',
] as const;

export type JeqlOperator = (typeof JEQL_OPERATORS)[number];

export type JeqlOrderDirection = 'asc' | 'desc';

export type JeqlScalarField = string;

export type JeqlSearchField = string[];

export type JeqlFieldSelector = JeqlScalarField | JeqlSearchField;

export type JeqlSimpleCondition = [field: JeqlFieldSelector, operator: JeqlOperator, value: unknown];

export type JeqlCondition =
  | JeqlSimpleCondition
  | { $whereAll: JeqlCondition[] }
  | { $whereAny: JeqlCondition[] };

export type JeqlRelationQueryMap = Record<string, JeqlQuery>;

export type JeqlRelationCardinality = 'one' | 'many';

export interface JeqlQuery {
  $select?: string[];
  $with?: JeqlRelationQueryMap;
  $whereAll?: JeqlCondition[];
  $whereAny?: JeqlCondition[];
  $whereHas?: JeqlRelationQueryMap;
  $whereNotHas?: JeqlRelationQueryMap;
  $orderBy?: [string, JeqlOrderDirection][];
  $limit?: number;
  $offset?: number;
  $withSemanticMatches?: string | string[] | Record<string, string>;
}

export interface JeqlCompileOptions {
  baseWhere?: Record<string, unknown>;
  relationCardinality?: Record<string, JeqlRelationCardinality>;
  relationFieldMap?: Record<string, string>;
  modelKey?: string;
}

export interface JeqlCompiledQuery {
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: Array<Record<string, JeqlOrderDirection>>;
  take?: number;
  skip?: number;
}

export interface SearchDirective {
  fields: string[];
  term: string;
}
