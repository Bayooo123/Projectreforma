import { prisma } from '@/lib/prisma';
import { Playbook } from './Playbook';

export class WorkspacePlaybook extends Playbook {
  constructor() {
    super('workspace');
  }

  getDescription(): string {
    return 'Represents a workspace or firm root that owns operational records.';
  }

  getFieldComments(): Record<string, string> {
    return {
      name: 'Display name of the workspace.',
      slug: 'Unique URL-safe workspace slug.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      name: 'required|string|max:255',
      slug: 'nullable|string|max:255',
      ownerId: 'required|string',
      plan: 'nullable|string|max:50',
      firmCode: 'nullable|string|max:255',
      joinPassword: 'nullable|string|max:255',
      letterheadUrl: 'nullable|string|max:2048',
      revenuePin: 'nullable|string|max:255',
      inviteLinkToken: 'nullable|string|max:255',
      litigationPin: 'nullable|string|max:255',
      adminCode: 'nullable|string|max:255',
      accentColor: 'nullable|string|max:20',
      brandColor: 'nullable|string|max:20',
      secondaryColor: 'nullable|string|max:20',
      brandingCompleted: 'nullable|boolean',
    };
  }

  getMutableChildRelationships(): string[] {
    return ['clients', 'matters', 'tasks', 'briefs', 'expenses', 'invitations', 'complianceTasks'];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return {};
  }

  getLookupLabel(record: any): string {
    return record?.name || record?.slug || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.slug || '';
  }

  getSearchableFields(): string[] {
    return ['name', 'slug'];
  }

  async resolve(id: string) {
    const rec = await prisma.workspace.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Workspace not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { members: { some: { userId: actor.id } } };
    }
    return { id: actor.id };
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.name || record.slug || record.id,
      'Workspace',
      [
        ['Slug',    record.slug],
        ['Created', this.formatDate(record.createdAt)],
      ],
    );
  }
}