/**
 * Bica Platform — Search Configuration
 * 
 * This registry defines which string fields are "searchable" for each Prisma model
 * during a `direct_lookup` operation. 
 * 
 * Design Note:
 * These fields match the `/// @searchable` tags added to schema.prisma.
 * Using a central registry prevents "Unknown argument" errors in Prisma 
 * by ensuring we only query fields that actually exist on the target model.
 */

export const SEARCH_REGISTRY: Record<string, string[]> = {
  workspace: ['name', 'slug', 'firmCode'],
  user: ['name', 'email'],
  client: ['name', 'email', 'company'],
  matter: ['name', 'caseNumber'],
  brief: ['name', 'briefNumber'],
  task: ['title', 'description'],
  invoice: ['invoiceNumber'],
  expense: ['description', 'reference'],
  bankAccount: ['bankName', 'accountName'],
  workspaceMember: ['designation'],
};

/**
 * Normalizes a relation/scope name to a Prisma model key.
 * (e.g. "Clients" -> "client", "Matter" -> "matter")
 */
export function getModelKey(name: string): string {
  const base = name.charAt(0).toLowerCase() + name.slice(1);
  // Strip trailing 's' for plural forms if the exact key isn't found
  if (!SEARCH_REGISTRY[base] && base.endsWith('s')) {
    const singular = base.slice(0, -1);
    if (SEARCH_REGISTRY[singular]) return singular;
  }
  return base;
}

/**
 * Returns the list of searchable fields for a given relation name.
 * Defaults to ['name'] if no configuration is found.
 */
export function getSearchableFields(relationName: string): string[] {
  const modelKey = getModelKey(relationName);
  return SEARCH_REGISTRY[modelKey] || ['name'];
}
