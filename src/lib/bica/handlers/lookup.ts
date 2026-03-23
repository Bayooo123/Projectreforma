import { BicaHandler } from './base';
import { JEQLCompiler } from '@/lib/jeql/compiler';
import { prisma } from '@/lib/prisma';

export class LookupHandler extends BicaHandler {
  private compiler = new JEQLCompiler();

  async handle(payload: any): Promise<any> {
    const { query_lang, scope, operations } = payload;

    if (query_lang !== 'jeql') {
      throw Object.assign(new Error('Only query_lang "jeql" is supported.'), { bicaCode: 'VALIDATION_ERROR' });
    }

    // Resolve the polymorphic scope (Laravel-style $entity->$relation())
    const whereScope = await this.resolveScope(scope);
    
    // Resolve scope -> Prisma model key
    const modelKey = scope.charAt(0).toLowerCase() + scope.slice(1);
    const delegate = (prisma as any)[modelKey];

    if (!delegate) {
      throw Object.assign(new Error(`Unknown scope: '${scope}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    // Compile JEQL to Prisma
    const prismaQuery = this.compiler.compile(operations);

    // Merge relation scope into the query
    const finalWhere = {
      AND: [whereScope, prismaQuery.where || {}]
    };

    const records = await delegate.findMany({
      where: finalWhere,
      orderBy: prismaQuery.orderBy,
      take: prismaQuery.take,
      skip: prismaQuery.skip,
    });

    return { 
      matches: records.map((r: any) => ({
        id: r.id,
        label: this.buildLabel(r, scope),
        secondaryLabel: this.buildSecondaryLabel(r),
        confidence: 0.95
      }))
    };
  }

  private buildLabel(record: any, scope: string): string {
    return record.name || record.title || record.caseNumber || record.briefNumber || record.id;
  }

  private buildSecondaryLabel(record: any): string {
    const parts: string[] = [];
    if (record.status) parts.push(`[${record.status}]`);
    if (record.email) parts.push(record.email);
    return parts.join(' ').slice(0, 255);
  }
}
