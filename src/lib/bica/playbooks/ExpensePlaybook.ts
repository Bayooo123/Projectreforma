import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class ExpensePlaybook extends Playbook {
  constructor() {
    super('expense');
  }

  getDescription(): string {
    return 'Represents an operational or overhead expense incurred by the firm.';
  }

  getFieldComments(): Record<string, string> {
    return {
      amount: 'Expense amount in kobo.',
      description: 'What the expense was for.',
      date: 'Date the expense was incurred.',
      reference: 'Receipt number or external reference.',
      category: 'Expense category (e.g. OFFICE_UTILITIES, COURT_LITIGATION, STAFF_COSTS).',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      workspaceId: 'prohibited',
      amount: 'required|integer|min:1',
      description: 'nullable|string',
      date: 'nullable|date',
      reference: 'nullable|string|max:255',
      category: 'required|in:OFFICE_UTILITIES,OFFICE_EQUIPMENT_MAINTENANCE,COURT_LITIGATION,NON_LITIGATION_ADVISORY,COMMUNICATION_SUBSCRIPTIONS,STAFF_COSTS,VEHICLE_LOGISTICS,MISCELLANEOUS',
    };
  }

  getMutableChildRelationships(): string[] {
    return [];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return { workspaceId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    return record?.description || record?.reference || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.category ? record.category.replace(/_/g, ' ') : '';
  }

  getSearchableFields(): string[] {
    return ['description', 'reference'];
  }

  async resolve(id: string) {
    const rec = await prisma.expense.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Expense not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { workspace: { members: { some: { userId: actor.id } } } };
    }
    return { workspaceId: actor.id };
  }

  private formatAmount(kobo: number | null | undefined): string {
    if (kobo == null) return '—';
    return `NGN ${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.description || record.reference || record.id,
      'Expense',
      [
        ['Amount',    this.formatAmount(record.amount)],
        ['Category',  record.category ? record.category.replace(/_/g, ' ') : undefined],
        ['Reference', record.reference],
        ['Date',      this.formatDate(record.date)],
      ],
    );
  }
}
