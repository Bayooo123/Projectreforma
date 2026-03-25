import type { JeqlQuery } from '../jeql';

export type CrudAction = 'create' | 'createMany' | 'read' | 'count' | 'update' | 'updateEach' | 'delete';

export interface CrudContext {
  platformEntity: any;
  platformEntityType: string;
  requestId: string;
}

export interface BaseCrudParameterSet {
  action: CrudAction;
  parentEntityType: string;
  parentEntityId: string;
  data: Record<string, unknown>;
}

export interface CrudCreateData {
  relationName: string;
  definition: Record<string, unknown>;
}

export interface CrudCreateManyData {
  relationName: string;
  definition: Record<string, unknown>[];
}

export interface CrudReadData {
  scope: string;
  targetOperations: JeqlQuery;
}

export interface CrudCountData {
  scope: string;
  targetOperations?: JeqlQuery;
}

export interface CrudUpdateData {
  scope: string;
  targetOperations: JeqlQuery;
  attributes: Record<string, unknown>;
}

export interface CrudUpdateEachData {
  scope: string;
  targetOperations: JeqlQuery;
  attributes: Record<string, Record<string, unknown>> | Record<string, unknown>[];
}

export interface CrudDeleteData {
  scope: string;
  targetOperations: JeqlQuery;
}

export type CrudParameterData =
  | CrudCreateData
  | CrudCreateManyData
  | CrudReadData
  | CrudCountData
  | CrudUpdateData
  | CrudUpdateEachData
  | CrudDeleteData;

export interface CrudParameterSet extends Omit<BaseCrudParameterSet, 'data'> {
  data: CrudParameterData;
}

export type CrudResult = Record<string, unknown>;
