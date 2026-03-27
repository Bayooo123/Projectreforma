import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class BriefPlaybook extends Playbook {
  constructor() {
    super('brief');
  }

  getDescription(): string {
    return 'Represents a legal brief or file opened on behalf of a client within a matter.';
  }

  getFieldComments(): Record<string, string> {
    return {
      name: 'Internal title or name of the brief.',
      briefNumber: 'System-assigned unique brief reference number.',
      customBriefNumber: 'Firm-assigned custom reference number.',
      category: 'Type or category of the brief.',
      status: 'Current lifecycle status of the brief.',
      dueDate: 'Target completion or filing date.',
      description: 'Detailed notes or instructions for the brief.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      briefNumber: 'prohibited',
      name: 'required|string|max:255',
      clientId: 'nullable|string|max:255',
      matterId: 'nullable|string|max:255',
      lawyerId: 'nullable|string|max:255',
      workspaceId: 'prohibited',
      customBriefNumber: 'nullable|string|max:100',
      customTitle: 'nullable|string|max:255',
      category: 'required|string|max:100',
      status: 'required|in:active,closed,archived',
      dueDate: 'nullable|date',
      description: 'nullable|string',
      inboundEmailId: 'prohibited',
      isLitigationDerived: 'nullable|boolean',
      lawyerInChargeId: 'nullable|string|max:255',
      deletedAt: 'nullable|date',
      lastSummarizedAt: 'nullable|date',
      summary: 'nullable|string',
      briefId: 'nullable|string|max:255',
    };
  }

  getMutableChildRelationships(): string[] {
    return ['Task'];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return { workspaceId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    return record?.name || record?.briefNumber || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    const num = record?.customBriefNumber || record?.briefNumber;
    return num ? `Brief #${num}` : record?.category || '';
  }

  getSearchableFields(): string[] {
    return ['name', 'briefNumber', 'description'];
  }

  async resolve(id: string) {
    const rec = await prisma.brief.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Brief not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { OR: [{ lawyerId: actor.id }, { lawyerInChargeId: actor.id }] };
    }
    return { workspaceId: actor.id };
  }

  getPreviewIncludes(): Record<string, unknown> {
    return {
      client: { select: { name: true } },
      matter: { select: { name: true, caseNumber: true } },
    };
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.name || record.briefNumber || record.id,
      'Brief',
      [
        ['Brief No.',  record.customBriefNumber || record.briefNumber],
        ['Category',   record.category],
        ['Client',     record.client?.name],
        ['Matter',     record.matter?.name],
        ['Due',        this.formatDate(record.dueDate)],
        ['Description', record.description ? this.truncate(record.description, 120) : undefined],
      ],
      record.status,
    );
  }
}
