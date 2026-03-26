import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class TaskPlaybook extends Playbook {
  constructor() {
    super('task');
  }

  getDescription(): string {
    return 'Represents a general task or action item within a workspace.';
  }

  getFieldComments(): Record<string, string> {
    return {
      title: 'The task title.',
      description: 'Detailed task instructions.',
      status: 'Current status of the task.',
      priority: 'Urgency level.',
      dueDate: 'Target completion date.',
    };
  }

  getBaseValidationRules(): Record<string, any> {
    return {
      id: 'prohibited',
      title: 'required|string|max:255',
      description: 'nullable|string',
      status: 'required|in:pending,in_progress,completed,on_hold',
      priority: 'required|in:low,medium,high,urgent',
      dueDate: 'nullable|date',
    };
  }

  getMutableChildRelationships(): string[] {
    return [];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return { workspaceId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    return record?.title || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.status ? `[${record.status}]` : '';
  }

  getSearchableFields(): string[] {
    return ['title', 'description'];
  }

  async resolve(id: string) {
    const rec = await prisma.task.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Task not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { OR: [{ assignedToId: actor.id }, { assignedById: actor.id }] };
    }
    return { workspaceId: actor.id };
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.title || record.id,
      'Task',
      [
        ['Priority',    record.priority],
        ['Due',         this.formatDate(record.dueDate)],
        ['Description', record.description ? this.truncate(record.description, 120) : undefined],
      ],
      record.status,
    );
  }
}