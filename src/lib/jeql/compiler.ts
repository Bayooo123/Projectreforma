import { JEQLQuery, PrismaQueryArgs, JEQLCondition, JEQLOperator } from './types';
import { MissingRelationshipKeyException, InvalidComparisonException } from './exceptions';

export class JEQLCompiler {
    /**
     * Compiles a JEQL query object into Prisma findMany/updateMany/etc. arguments.
     * @param query The JEQL query object.
     * @param modelName Optional model name for relationship key validation.
     */
    compile(query: JEQLQuery, modelName?: string): PrismaQueryArgs {
        const args: PrismaQueryArgs = {};

        // 1. Handle Selection ($select)
        if (query.$select && query.$select.length > 0) {
            args.select = {};
            query.$select.forEach(field => {
                if (field.includes('.')) {
                    throw new InvalidComparisonException(
                        `Dot-notation not allowed in $select: '${field}'. Use $with to shape related fields.`
                    );
                }
                args.select[field] = true;
            });
        }

        // 2. Handle Eager Loading ($with)
        if (query.$with) {
            for (const [relation, subQuery] of Object.entries(query.$with)) {
                this.validateRelationshipKeys(modelName, relation, query.$select);

                const subArgs = this.compile(subQuery);

                if (args.select) {
                    args.select[relation] = Object.keys(subArgs).length > 0 ? subArgs : true;
                } else {
                    if (!args.include) args.include = {};
                    args.include[relation] = Object.keys(subArgs).length > 0 ? subArgs : true;
                }
            }
        }

        // 2b. Handle Semantic Matches ($withSemanticMatches)
        if (query.$withSemanticMatches) {
            const relation = 'semanticMatches';
            const semanticArgs = {
                where: {
                    concept: typeof query.$withSemanticMatches === 'string'
                        ? query.$withSemanticMatches
                        : { in: Array.isArray(query.$withSemanticMatches) ? query.$withSemanticMatches : Object.values(query.$withSemanticMatches) }
                }
            };

            if (args.select) {
                args.select[relation] = semanticArgs;
            } else {
                if (!args.include) args.include = {};
                args.include[relation] = semanticArgs;
            }
        }

        // 3. Handle Filtering ($whereAll, $whereAny)
        const whereConditions: any[] = [];
        if (query.$whereAll) {
            // Spread $whereAll into the main conditions to avoid redundant AND nesting
            whereConditions.push(...this.compileConditions(query.$whereAll));
        }
        if (query.$whereAny) {
            whereConditions.push({ OR: this.compileConditions(query.$whereAny) });
        }

        // 4. Handle Relationship Existence Filters ($whereHas, $whereNotHas)
        if (query.$whereHas) {
            for (const [relation, conditions] of query.$whereHas) {
                const subConditions = this.compileConditions(conditions);
                const subWhere = subConditions.length === 1 ? subConditions[0] : { AND: subConditions };
                whereConditions.push({ [relation]: { some: subWhere } });
            }
        }
        if (query.$whereNotHas) {
            for (const [relation, conditions] of query.$whereNotHas) {
                const subConditions = this.compileConditions(conditions);
                const subWhere = subConditions.length === 1 ? subConditions[0] : { AND: subConditions };
                whereConditions.push({ [relation]: { none: subWhere } });
            }
        }

        if (whereConditions.length > 0) {
            args.where = whereConditions.length === 1 ? whereConditions[0] : { AND: whereConditions };
        }

        // 5. Handle Sorting ($orderBy)
        if (query.$orderBy) {
            args.orderBy = query.$orderBy.map(([field, direction]) => ({
                [field]: direction
            }));
        }

        // 6. Handle Pagination ($limit, $offset)
        if (query.$limit !== undefined) args.take = query.$limit;
        if (query.$offset !== undefined) args.skip = query.$offset;

        return args;
    }

    private compileConditions(conditions: JEQLCondition[]): any[] {
        return conditions.map(condition => {
            // Nested group: { $whereAll: [...] }
            if (!Array.isArray(condition) && '$whereAll' in condition) {
                return { AND: this.compileConditions(condition.$whereAll) };
            }
            // Nested group: { $whereAny: [...] }
            if (!Array.isArray(condition) && '$whereAny' in condition) {
                return { OR: this.compileConditions(condition.$whereAny) };
            }

            if (Array.isArray(condition)) {
                const [fields, operator, value] = condition;

                // Dot-notation is not allowed in direct where filters
                if (typeof fields === 'string' && fields.includes('.') && !fields.startsWith('semantic_match:')) {
                    throw new InvalidComparisonException(
                        `Dot-notation not allowed in JEQL filters: '${fields}'. Use $whereHas instead.`
                    );
                }

                // search operator: fuzzy text match across one or more columns
                if (operator === 'search') {
                    return this.compileSearch(fields, value);
                }

                if (typeof fields === 'string') {
                    return this.mapCondition(fields, operator, value);
                } else if (Array.isArray(fields)) {
                    // Multi-column only supported for 'search'
                    throw new InvalidComparisonException(
                        `Multi-column comparison only supported for 'search' operator.`
                    );
                }
            }

            return {};
        });
    }

    private mapCondition(field: string, operator: JEQLOperator, value: any): any {
        switch (operator) {
            case '=': return { [field]: value };
            case '!=': return { [field]: { not: value } };
            case '>': return { [field]: { gt: value } };
            case '<': return { [field]: { lt: value } };
            case '>=': return { [field]: { gte: value } };
            case '<=': return { [field]: { lte: value } };
            case 'in': return { [field]: { in: value } };
            case 'not in': return { [field]: { notIn: value } };
            case 'like': return { [field]: { contains: value.replace(/%/g, ''), mode: 'insensitive' } };
            case 'json_contains': return { [field]: { array_contains: value } };

            // Date operators
            case 'date=': return { [field]: { equals: new Date(value) } };
            case 'date!=': return { [field]: { not: { equals: new Date(value) } } };
            case 'date>': return { [field]: { gt: new Date(value) } };
            case 'date<': return { [field]: { lt: new Date(value) } };
            case 'date>=': return { [field]: { gte: new Date(value) } };
            case 'date<=': return { [field]: { lte: new Date(value) } };
            case 'date_between':
                return { [field]: { gte: new Date(value[0]), lte: new Date(value[1]) } };

            default: return { [field]: value };
        }
    }

    private compileSearch(fields: string | string[], term: string): any {
        const columns = Array.isArray(fields) ? fields : [fields];
        const orConditions = columns.map(col => ({
            [col]: { contains: term, mode: 'insensitive' }
        }));
        return orConditions.length === 1 ? orConditions[0] : { OR: orConditions };
    }

    private validateRelationshipKeys(model?: string, relation?: string, selects?: string[]) {
        if (model && relation && selects && selects.length > 0) {
            const schema: any = {
                'Matter': {
                    'client': ['clientId'],
                    'lawyers': ['id']
                }
            };

            const requiredKeys = schema[model]?.[relation];
            if (requiredKeys) {
                const missing = requiredKeys.filter((k: string) => !selects.includes(k));
                if (missing.length > 0) {
                    throw new MissingRelationshipKeyException(model, relation, missing);
                }
            }
        }
    }
}
