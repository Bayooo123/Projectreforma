import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class UserPlaybook extends Playbook {
  constructor() {
    super('user');
  }

  getDescription(): string {
    return 'Represents a Reforma user who can act within a workspace.';
  }

  getFieldComments(): Record<string, string> {
    return {
      name: 'Display name of the user.',
      email: 'Primary email address.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      name: 'nullable|string|max:255',
      email: 'required|email|max:255',
      password: 'nullable|string|max:255',
      phone: 'nullable|string|max:30',
      image: 'nullable|string|max:2048',
      jobTitle: 'nullable|string|max:255',
      lawyerToken: 'nullable|string|max:255',
      isPlatformAdmin: 'nullable|boolean',
      mfaEnabled: 'nullable|boolean',
      mfaSecret: 'nullable|string|max:255',
    };
  }

  getMutableChildRelationships(): string[] {
    return [];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return {};
  }

  getLookupLabel(record: any): string {
    return record?.name || record?.email || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.email || '';
  }

  getSearchableFields(): string[] {
    return ['name', 'email'];
  }

  async resolve(id: string) {
    const rec = await prisma.user.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`User not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      // A user can see other users in the same workspace via membership
      return { workspace: { members: { some: { userId: actor.id } } } };
    }
    return { workspaceId: actor.id };
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.name || record.email || record.id,
      'User',
      [
        ['Email', record.email],
      ],
    );
  }
}