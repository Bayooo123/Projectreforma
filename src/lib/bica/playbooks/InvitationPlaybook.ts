import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class InvitationPlaybook extends Playbook {
  constructor() {
    super('invitation');
  }

  getDescription(): string {
    return 'Represents an invitation sent to a person to join a workspace with a specific role.';
  }

  getFieldComments(): Record<string, string> {
    return {
      email: 'Email address of the invited person.',
      role: 'The role being granted (e.g. admin, member).',
      status: 'Current state of the invitation.',
      expiresAt: 'Date the invitation link expires.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      workspaceId: 'prohibited',
      email: 'required|email|max:255',
      role: 'required|string|max:100',
      tokenHash: 'prohibited',
      invitedBy: 'nullable|string|max:255',
      status: 'nullable|in:pending,accepted,revoked,expired',
      expiresAt: 'nullable|date',
      acceptedAt: 'nullable|date',
      revokedAt: 'nullable|date',
      ipAddress: 'nullable|string|max:255',
      userAgent: 'nullable|string|max:1000',
    };
  }

  getMutableChildRelationships(): string[] {
    return [];
  }

  isWritable(): boolean {
    return false;
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return { workspaceId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    return record?.email || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.role || '';
  }

  getSearchableFields(): string[] {
    return ['email', 'role'];
  }

  async resolve(id: string) {
    const rec = await prisma.invitation.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Invitation not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { workspace: { members: { some: { userId: actor.id } } } };
    }
    return { workspaceId: actor.id };
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.email || record.id,
      'Invitation',
      [
        ['Role',     record.role],
        ['Expires',  this.formatDate(record.expiresAt)],
        ['Accepted', this.formatDate(record.acceptedAt)],
        ['Revoked',  this.formatDate(record.revokedAt)],
      ],
      record.status,
    );
  }
}
