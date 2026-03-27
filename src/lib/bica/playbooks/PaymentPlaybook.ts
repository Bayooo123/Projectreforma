import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class PaymentPlaybook extends Playbook {
  constructor() {
    super('payment');
  }

  getDescription(): string {
    return 'Represents a payment received from a client against an invoice or retainer.';
  }

  getFieldComments(): Record<string, string> {
    return {
      amount: 'Amount paid in kobo.',
      date: 'Date the payment was received.',
      method: 'Payment method (e.g. bank transfer, cash, cheque).',
      reference: 'Bank reference or transaction ID.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      clientId: 'nullable|string|max:255',
      invoiceId: 'nullable|string|max:255',
      amount: 'required|integer|min:1',
      date: 'nullable|date',
      method: 'required|string|max:100',
      reference: 'nullable|string|max:255',
    };
  }

  getMutableChildRelationships(): string[] {
    return [];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    const t = String((parentEntityType || '')).toLowerCase();
    if (t === 'invoice') return { invoiceId: parentEntity.id, clientId: parentEntity.clientId };
    return { clientId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    return record?.reference || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.method || '';
  }

  getSearchableFields(): string[] {
    return ['reference', 'method'];
  }

  async resolve(id: string) {
    const rec = await prisma.payment.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Payment not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { client: { workspace: { members: { some: { userId: actor.id } } } } };
    }
    return { client: { workspaceId: actor.id } };
  }

  getPreviewIncludes(): Record<string, unknown> {
    return {
      client: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
    };
  }

  private formatAmount(kobo: number | null | undefined): string {
    if (kobo == null) return '—';
    return `NGN ${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.reference || record.id,
      'Payment',
      [
        ['Amount',  this.formatAmount(record.amount)],
        ['Method',  record.method],
        ['Client',  record.client?.name],
        ['Invoice', record.invoice?.invoiceNumber],
        ['Date',    this.formatDate(record.date)],
      ],
    );
  }
}
