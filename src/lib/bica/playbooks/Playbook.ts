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
}