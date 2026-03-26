export abstract class Playbook {
  constructor(public readonly modelKey: string) {}

  /**
   * Returns the canonical, human-readable description for this model.
   */
  abstract getDescription(): string;

  /**
   * Returns concise field comments or labels for the model's important fields.
   */
  abstract getFieldComments(): Record<string, string>;

  /**
   * Returns the base validation rules for the model.
   */
  abstract getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any>;

  /**
   * Returns the child relationships that can be mutated through this model.
   */
  abstract getMutableChildRelationships(): string[];

  /**
   * Returns the child relationships that can be read through this model.
   */
  getReadableChildRelationships(): string[] {
    return this.getMutableChildRelationships();
  }

  /**
   * Returns the complete set of child relationships associated with this model.
   */
  getChildRelationships(): string[] {
    return this.getReadableChildRelationships();
  }

  /**
   * Returns the parent model types that can own this model.
   */
  getAllowedParents(): string[] {
    return ['biz'];
  }

  /**
   * Returns validation rule overrides that should replace the base rules.
   */
  getValidationRuleOverrides(forRecord: any, operation: string = 'create'): Record<string, string[]> {
    return {};
  }

  /**
   * Returns fields that are automatically populated by the system.
   */
  getAutoSetFields(): string[] {
    return [];
  }

  /**
   * Returns whether the model can be mutated through Bica.
   */
  isWritable(): boolean {
    return true;
  }

  /**
   * Returns whether the model can be previewed through Bica.
   */
  isPreviewable(): boolean {
    return true;
  }

  /**
   * Returns the Prisma `include` fragment to pass when fetching records for
   * preview. Default is empty — no relations are loaded. Override to eagerly
   * load related data that getPreviewHtml() needs to render its card.
   */
  getPreviewIncludes(): Record<string, unknown> {
    return {};
  }

  /**
   * Returns a self-contained HTML string representing the preview card for
   * the given record. The record will already include any relations declared
   * in getPreviewIncludes(). Use the protected buildCard() helper to keep
   * card styles consistent across all playbooks.
   */
  abstract getPreviewHtml(record: any): string;

  /**
   * Returns the primary label to use when Bica presents a record.
   */
  abstract getLookupLabel(record: any): string;

  /**
   * Returns the secondary label to use when Bica presents a record.
   */
  abstract getLookupSecondaryLabel(record: any): string;

  /**
   * Returns the searchable string fields for this model.
   */
  abstract getSearchableFields(): string[];

  /**
   * Resolve a single record by id. Implementations should return the
   * Prisma record or throw an error (name='MorphEntityNotFoundError') when
   * the record does not exist.
   */
  abstract resolve(id: string): Promise<any>;

  /**
   * Returns the automatic create-time scope for this model.
   *
   * The resolved parent entity is the anchor for the relationship being
   * mutated, so concrete playbooks can derive foreign-key wiring from it.
   */
  abstract getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown>;

  /**
   * Return a Prisma `where` fragment that scopes queries for this model
   * based on an acting platform entity (actor) and its type. This is the
   * Playbook equivalent of a Laravel local scope and should be used by
   * handlers to enforce tenant/actor boundaries.
   *
   * Example return values:
   * - `{ workspaceId: actor.id }`
   * - `{ OR: [{ assignedToId: actor.id }, { assignedById: actor.id }] }`
   */
  abstract getScopeFilter(actor: any, actorType: string): any;

  // ─── Preview rendering helpers ───────────────────────────────────────────

  protected escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  protected formatDate(value: unknown): string {
    if (value == null || value === '') return '—';
    try {
      return new Date(value as any).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(value);
    }
  }

  protected truncate(value: unknown, maxLength = 120): string {
    const str = String(value ?? '');
    return str.length > maxLength ? `${str.slice(0, maxLength)}\u2026` : str;
  }

  protected statusColor(status: unknown): string {
    switch (String(status ?? '').toLowerCase()) {
      case 'active':       return '#3182ce';
      case 'inactive':     return '#94a3b8';
      case 'closed':       return '#ef4444';
      case 'pending':      return '#f59e0b';
      case 'in_progress':  return '#8b5cf6';
      case 'completed':    return '#10b981';
      case 'on_hold':      return '#6b7280';
      case 'urgent':       return '#ef4444';
      case 'high':         return '#f97316';
      case 'medium':       return '#f59e0b';
      case 'low':          return '#94a3b8';
      default:             return '#6b7280';
    }
  }

  /**
   * Builds a standard Bica preview card.
   *
   * @param title  - Primary heading (e.g. record name).
   * @param label  - Entity type label shown above the title (e.g. 'CLIENT').
   * @param rows   - Key/value pairs for the detail table. Nullish rows are hidden.
   * @param status - Optional status string rendered as a coloured pill badge.
   */
  protected buildCard(
    title: string,
    label: string,
    rows: Array<[string, string | null | undefined]>,
    status?: string,
  ): string {
    const e = (v: unknown) => this.escapeHtml(v);
    const badge = status
      ? `<span style="flex-shrink:0;background:${this.statusColor(status)};color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:.3px;">${e(status.replace(/_/g, ' '))}</span>`
      : '';
    const visibleRows = rows.filter(([, v]) => v != null && String(v).trim() !== '');
    const tbody = visibleRows
      .map(
        ([k, v]) =>
          `<tr><td style="color:#94a3b8;padding:3px 14px 3px 0;white-space:nowrap;font-weight:500;vertical-align:top;font-size:12px;">${e(k)}</td>` +
          `<td style="color:#1e293b;padding:3px 0;font-size:12px;">${e(v)}</td></tr>`,
      )
      .join('');
    const body = tbody
      ? `<div style="padding:12px 16px;"><table style="width:100%;border-collapse:collapse;">${tbody}</table></div>`
      : '';
    return (
      `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;` +
      `max-width:400px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;` +
      `background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.06);">` +
      `<div style="background:#121826;padding:12px 16px;">` +
      `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">` +
      `<div>` +
      `<div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#64748b;margin-bottom:3px;">${e(label)}</div>` +
      `<div style="font-size:15px;font-weight:700;color:#fff;line-height:1.3;">${e(title)}</div>` +
      `</div>` +
      badge +
      `</div></div>` +
      body +
      `</div>`
    );
  }
}