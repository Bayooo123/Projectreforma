import { Playbook } from './Playbook';

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

  getLookupLabel(record: any): string {
    return record?.title || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.status ? `[${record.status}]` : '';
  }

  getSearchableFields(): string[] {
    return ['title', 'description'];
  }
}