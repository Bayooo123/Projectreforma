import { LookupHandler } from './lookup';
import { DirectLookupHandler } from './direct-lookup';
import { WriteHandler } from './write';
import { PreviewHandler } from './preview';
import { BicaContext } from './types';

export function getHandler(operationType: string, context: BicaContext) {
  switch (operationType) {
    case 'lookup':
      return new LookupHandler(context);
    case 'direct_lookup':
      return new DirectLookupHandler(context);
    case 'write':
      return new WriteHandler(context);
    case 'preview':
      return new PreviewHandler(context);
    default:
      return null;
  }
}

export * from './types';
export * from './base';
