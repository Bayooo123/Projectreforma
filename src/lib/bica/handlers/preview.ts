import { BicaHandler } from './base';
import { prisma } from '@/lib/prisma';

export class PreviewHandler extends BicaHandler {
  async handle(payload: any): Promise<any> {
    const { relationName, id } = payload;

    if (!relationName || !id) {
      throw Object.assign(
        new Error('preview requires "relationName" and "id".'),
        { bicaCode: 'VALIDATION_ERROR' }
      );
    }

    // Resolve the polymorphic scope (Laravel-style $entity->$relation())
    const whereScope = await this.resolveScope(relationName);
    
    const modelKey = relationName.charAt(0).toLowerCase() + relationName.slice(1);
    const delegate = (prisma as any)[modelKey];

    if (!delegate) {
      throw Object.assign(new Error(`Unknown relationName: '${relationName}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    const record = await delegate.findFirst({
        where: { id, ...whereScope }
    });

    if (!record) {
      throw Object.assign(new Error(`Entity not found.`), { bicaCode: 'NOT_FOUND' });
    }

    return {
      html: this.renderCard(record, relationName)
    };
  }

  private renderCard(record: any, scope: string): string {
    const title = record.name || record.title || record.caseNumber || 'Entity Preview';
    const subtitle = record.email || record.status || '';
    
    return `
      <div style="font-family: sans-serif; padding: 12px; border: 1px solid #eee; border-radius: 8px;">
        <h3 style="margin: 0 0 4px 0; font-size: 16px;">${title}</h3>
        ${subtitle ? `<p style="margin: 0; font-size: 14px; color: #666;">${subtitle}</p>` : ''}
        <div style="margin-top: 8px; font-size: 12px; color: #999;">Type: ${scope}</div>
      </div>
    `;
  }
}
