import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class ComplianceTaskPlaybook extends Playbook {
  constructor() {
    super('compliancetask');
  }

  getDescription(): string {
    return 'Represents a regulatory compliance obligation assigned to a workspace, tracking its status, due date, and evidence of completion.';
  }

  getFieldComments(): Record<string, string> {
    return {
      status: 'Completion status of the compliance task.',
      dueDate: 'Deadline for the compliance action.',
      period: 'The compliance reporting period (e.g. Q1 2025, Annual 2024).',
      evidenceUrl: 'URL to supporting evidence or filed document.',
      acknowledgedAt: 'Timestamp when the task was marked complete.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      obligationId: 'nullable|string|max:255',
      workspaceId: 'prohibited',
      status: 'required|in:pending,acknowledged,overdue',
      dueDate: 'nullable|date',
      period: 'nullable|string|max:100',
      evidenceUrl: 'nullable|string|max:2048',
      acknowledgedAt: 'nullable|date',
      acknowledgedBy: 'nullable|string|max:255',
    };
  }

  getMutableChildRelationships(): string[] {
    return [];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return { workspaceId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    return record?.period || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.status || '';
  }

  getSearchableFields(): string[] {
    return ['period'];
  }

  async resolve(id: string) {
    const rec = await prisma.complianceTask.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`ComplianceTask not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { workspace: { members: { some: { userId: actor.id } } } };
    }
    return { workspaceId: actor.id };
  }

  getPreviewIncludes(): Record<string, unknown> {
    return {
      obligation: { select: { actionRequired: true, regulatoryBody: true, nature: true, frequency: true } },
    };
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.obligation?.actionRequired || record.period || record.id,
      'Compliance Task',
      [
        ['Regulatory Body', record.obligation?.regulatoryBody],
        ['Nature',          record.obligation?.nature],
        ['Frequency',       record.obligation?.frequency],
        ['Period',          record.period],
        ['Due',             this.formatDate(record.dueDate)],
        ['Acknowledged',    this.formatDate(record.acknowledgedAt)],
        ['Evidence',        record.evidenceUrl],
      ],
      record.status,
    );
  }
}
