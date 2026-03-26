import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class ClientPlaybook extends Playbook {
  constructor() {
    super('client');
  }

  getDescription(): string {
    return 'Represents an individual or organization served by the firm.';
  }

  getFieldComments(): Record<string, string> {
    return {
      name: 'Full legal name of the client or organization.',
      email: 'Primary contact email.',
      phone: 'Primary contact phone number.',
      company: 'Company name if the client is an organization.',
      industry: 'Industry sector.',
      status: 'Relationship status.',
    };
  }

  getBaseValidationRules(): Record<string, any> {
    return {
      id: 'prohibited',
      name: 'required|string|max:255',
      email: 'required|email|max:255',
      phone: 'nullable|string|max:20',
      company: 'nullable|string|max:255',
      industry: 'nullable|string|max:100',
      status: 'required|in:active,inactive',
    };
  }

  getMutableChildRelationships(): string[] {
    return ['Matter', 'Brief', 'Invoice', 'Payment'];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return { workspaceId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    return record?.name || record?.company || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.company ? `Company: ${record.company}` : record?.email || '';
  }

  getSearchableFields(): string[] {
    return ['name', 'email', 'company'];
  }

  async resolve(id: string) {
    const rec = await prisma.client.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Client not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { workspace: { members: { some: { userId: actor.id } } } };
    }
    // workspace/firm or other actors default to workspace scoping
    return { workspaceId: actor.id };
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.name || record.company || record.id,
      'Client',
      [
        ['Email',    record.email],
        ['Phone',    record.phone],
        ['Company',  record.company],
        ['Industry', record.industry],
      ],
      record.status,
    );
  }
}