import { BicaHandler } from '../handlers/base';
import { prisma } from '@/lib/prisma';
import { getPlaybook } from '../playbooks';

export class PreviewHandler extends BicaHandler {
  async handle(payload: any): Promise<any> {
    const { model, ids } = payload;

    if (!model || !Array.isArray(ids) || ids.length === 0) {
      throw Object.assign(new Error('preview requires "model" and "ids" array.'), { bicaCode: 'VALIDATION_ERROR' });
    }

    const playbook = getPlaybook(model);
    if (!playbook) {
      throw Object.assign(new Error(`Unknown model: '${model}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    const delegate = (prisma as any)[playbook.modelKey];
    if (!delegate) {
      throw Object.assign(new Error(`Unknown model: '${model}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    const whereScope = await this.resolveScope(model);
    
    const records = await delegate.findMany({
      where: { id: { in: ids }, ...whereScope },
    });

    const cardMap: Record<string, string> = {};
    for (const r of records) {
      const label = playbook.getLookupLabel(r);
      const secondaryLabel = playbook.getLookupSecondaryLabel(r);
      cardMap[r.id] = `<div class="bica-preview-card">
  <h4 style="margin:0 0 4px;font-size:14px;">${this.escapeHtml(label)}</h4>
  <p style="margin:0;font-size:12px;color:#666;">${this.escapeHtml(secondaryLabel)}</p>
  <span style="font-size:11px;color:#999;">${this.escapeHtml(model)} · ${this.escapeHtml(r.id)}</span>
</div>`;
    }

    return cardMap;
  }

  private escapeHtml(str: string): string {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
