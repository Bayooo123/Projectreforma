/**
 * Bica Relation Resolver
 * 
 * Implements Laravel-style polymorphic scoping: $entity->$relationName()
 */

export type EntityResolver = (entity: any, relation: string) => Promise<any>;

export const RELATION_RESOLVERS: Record<string, EntityResolver> = {
  'user': async (user: any, relation: string) => {
    // Mapping for User entity relations
    const map: Record<string, any> = {
      'clients': { workspace: { members: { some: { userId: user.id } } } },
      'matters': { OR: [{ lawyerInChargeId: user.id }, { lawyers: { some: { lawyerId: user.id } } }] },
      'briefs': { OR: [{ lawyerId: user.id }, { lawyerInChargeId: user.id }] },
      'tasks': { OR: [{ assignedToId: user.id }, { assignedById: user.id }] },
      'expenses': { workspace: { members: { some: { userId: user.id } } } },
      'calendarEntries': { OR: [{ submittingLawyerId: user.id }, { appearances: { some: { id: user.id } } }] },
    };

    const normalized = relation.toLowerCase();
    // try both plural and singular keys
    return map[normalized] || map[normalized + 's'] || (normalized.endsWith('s') ? map[normalized.slice(0, -1)] : null);
  },

  'firm': async (firm: any, _relation: string) => {
    // Firm (Workspace) scoping is simple: everything belongs to this workspaceId
    return { workspaceId: firm.id };
  }
};

export async function resolveRelationScope(entity: any, entityType: string, relationName: string): Promise<any> {
    const resolver = RELATION_RESOLVERS[entityType.toLowerCase()];
    if (!resolver) {
      throw new Error(`No relation resolver defined for entity type "${entityType}"`);
    }

    const scope = await resolver(entity, relationName);
    if (!scope) {
      // Fallback: if we don't have a specific relation map, try a default workspaceId match
      // assuming the entity has an ID that might be a workspaceId
      return { workspaceId: entity.id };
    }

    return scope;
}
