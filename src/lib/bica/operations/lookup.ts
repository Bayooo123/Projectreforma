import { BicaHandler } from '../handlers/base';
import { JEQLCompiler } from '@/lib/jeql/compiler';
import { prisma } from '@/lib/prisma';
import { getPlaybook } from '../playbooks';

export class LookupHandler extends BicaHandler {
  async handle(payload: any): Promise<any> {
    const { query_lang, scope, operations } = payload;

    if (query_lang !== 'jeql') {
      throw Object.assign(new Error('Only query_lang "jeql" is supported.'), { bicaCode: 'VALIDATION_ERROR' });
    }
    if (!scope) {
      throw Object.assign(new Error('lookup payload must include "scope".'), { bicaCode: 'VALIDATION_ERROR' });
    }

    const playbook = getPlaybook(scope);
    if (!playbook) {
      throw Object.assign(new Error(`Unknown scope: '${scope}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    const delegate = (prisma as any)[playbook.modelKey];
    if (!delegate) {
      throw Object.assign(new Error(`Unknown scope: '${scope}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    // Resolve the polymorphic scope
    const whereScope = await this.resolveScope(scope);
    
    const compiler = new JEQLCompiler();
    const prismaArgs = compiler.compile((operations || {}) as any); // Changed JEQLQuery to any as it's not defined in the original context

    // Enforce scope
    prismaArgs.where = { ...(prismaArgs.where || {}), ...whereScope };

    const records = await delegate.findMany(prismaArgs);

    return {
      matches: records.map((r: any) => ({
        id: r.id,
        label: playbook.getLookupLabel(r),
        secondaryLabel: playbook.getLookupSecondaryLabel(r),
        confidence: 1.0,
      })),
    };
  }
}
