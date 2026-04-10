import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class InvoicePlaybook extends Playbook {
  constructor() {
    super('invoice');
  }

  getDescription(): string {
    return 'Represents a billing invoice issued to a client for legal services rendered.';
  }

  getFieldComments(): Record<string, string> {
    return {
      invoiceNumber: 'Unique invoice reference number.',
      billToName: 'Name of the billed party.',
      billToAddress: 'Billing address.',
      date: 'Invoice issue date.',
      dueDate: 'Payment due date.',
      status: 'Payment status of the invoice.',
      subtotal: 'Pre-tax total in kobo.',
      vatAmount: 'VAT component in kobo.',
      totalAmount: 'Grand total payable in kobo.',
      notes: 'Additional notes or payment instructions.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      invoiceNumber: 'prohibited',
      clientId: 'nullable|string|max:255',
      matterId: 'nullable|string|max:255',
      billToName: 'required|string|max:255',
      billToAddress: 'nullable|string',
      billToCity: 'nullable|string|max:255',
      billToState: 'nullable|string|max:255',
      attentionTo: 'nullable|string|max:255',
      date: 'nullable|date',
      dueDate: 'nullable|date',
      status: 'required|in:pending,paid,overdue,cancelled',
      notes: 'nullable|string',
      subtotal: 'nullable|integer|min:0',
      vatRate: 'nullable|numeric|min:0',
      vatAmount: 'nullable|integer|min:0',
      securityChargeRate: 'nullable|numeric|min:0',
      securityChargeAmount: 'nullable|integer|min:0',
      totalAmount: 'nullable|integer|min:0',
      followUpSent: 'nullable|boolean',
    };
  }

  getMutableChildRelationships(): string[] {
    return ['InvoiceItem', 'Payment'];
  }

  async getCreateScope(parentEntity: any, parentEntityType: string): Promise<Record<string, unknown>> {
    const { generateInvoiceNumber } = await import('@/app/actions/invoices');
    const invoiceNumber = await generateInvoiceNumber(parentEntity.id);

    const t = String((parentEntityType || '')).toLowerCase();
    if (t === 'matter') return { matterId: parentEntity.id, clientId: parentEntity.clientId, invoiceNumber };
    return { clientId: parentEntity.id, invoiceNumber };
  }

  getLookupLabel(record: any): string {
    return record?.invoiceNumber || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.billToName || '';
  }

  getSearchableFields(): string[] {
    return ['invoiceNumber', 'billToName'];
  }

  async resolve(id: string) {
    const rec = await prisma.invoice.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Invoice not found: ${id}`), { name: 'MorphEntityNotFoundError' });
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
    return { client: { select: { name: true } } };
  }

  private formatAmount(kobo: number | null | undefined): string {
    if (kobo == null) return '—';
    return `NGN ${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getPreviewHtml(record: any): string {
    return this.buildCard(
      record.invoiceNumber || record.id,
      'Invoice',
      [
        ['Bill To',  record.billToName],
        ['Client',   record.client?.name],
        ['Issued',   this.formatDate(record.date)],
        ['Due',      this.formatDate(record.dueDate)],
        ['Subtotal', this.formatAmount(record.subtotal)],
        ['VAT',      this.formatAmount(record.vatAmount)],
        ['Total',    this.formatAmount(record.totalAmount)],
        ['Notes',    record.notes ? this.truncate(record.notes, 120) : undefined],
      ],
      record.status,
    );
  }
}
