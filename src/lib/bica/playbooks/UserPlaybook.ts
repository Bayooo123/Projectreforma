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

  getBaseValidationRules(): Record<string, any> {
    return {
      id: 'prohibited',
      name: 'nullable|string|max:255',
      email: 'required|email|max:255',
    };
  }

  getMutableChildRelationships(): string[] {
    return [];
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
}