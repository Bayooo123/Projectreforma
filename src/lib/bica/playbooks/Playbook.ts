export abstract class Playbook {
  constructor(public readonly modelKey: string) {}

  /**
   * Returns the human-readable model name used in lookup payloads.
   */
  getModelName(): string {
    const constructorName = this.constructor?.name || '';
    const strippedName = constructorName.replace(/Playbook$/, '');
    if (strippedName && strippedName !== 'Playbook') {
      return strippedName;
    }

    return this.modelKey
      ? this.modelKey.charAt(0).toUpperCase() + this.modelKey.slice(1)
      : '';
  }

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

  protected statusBadgeClasses(status: unknown): string {
    const base = 'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ring-inset';

    switch (String(status ?? '').toLowerCase()) {
      case 'active':
        return `${base} bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20`;
      case 'inactive':
        return `${base} bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700`;
      case 'closed':
        return `${base} bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20`;
      case 'pending':
        return `${base} bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20`;
      case 'in_progress':
        return `${base} bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20`;
      case 'completed':
        return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20`;
      case 'on_hold':
        return `${base} bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700`;
      case 'urgent':
        return `${base} bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20`;
      case 'high':
        return `${base} bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20`;
      case 'medium':
        return `${base} bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20`;
      case 'low':
        return `${base} bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700`;
      default:
        return `${base} bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700`;
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
    const statusText = status ? status.replace(/_/g, ' ') : '';
    const badge = status
      ? `<span class="${this.statusBadgeClasses(status)}">${e(statusText)}</span>`
      : '';
    const visibleRows = rows.filter(([, v]) => v != null && String(v).trim() !== '');
    const tbody = visibleRows
      .map(
        ([k, v]) =>
          `<tr class="align-top">` +
          `<td class="w-32 whitespace-nowrap pr-4 pt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">${e(k)}</td>` +
          `<td class="pt-0.5 text-sm leading-6 text-slate-700 dark:text-slate-200">${e(v)}</td></tr>`,
      )
      .join('');
    const body = tbody
      ? `<div class="px-4 py-4"><table class="w-full border-separate border-spacing-y-2">${tbody}</table></div>`
      : '';
    return (
      `<div class="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none dark:ring-white/10">` +
      `<div class="flex items-start justify-between gap-3 border-b border-slate-200/70 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60">` +
      `<div class="min-w-0">` +
      `<div class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">${e(label)}</div>` +
      `<div class="mt-1 truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">${e(title)}</div>` +
      `</div>` +
      badge +
      `</div>` +
      body +
      `</div>`
    );
  }
}