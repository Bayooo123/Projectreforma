import { prisma } from '@/lib/prisma';
import { BicaHandler } from '../handlers/base';
import { getPlaybook } from '../playbooks';
import {
	JeqlCompiledQuery,
	JeqlCompiler,
	JeqlQuery,
	JeqlValidationError,
	SearchDirective,
	getPrismaRelationMetadata,
	normalizeText,
} from '../lib/jeql';

export class LookupHandler extends BicaHandler {
	private readonly compiler = new JeqlCompiler();

	async handle(payload: any): Promise<any> {
		const { query_lang, scope, operations } = payload ?? {};

		if (query_lang !== 'jeql') {
			throw Object.assign(new Error('lookup requires query_lang="jeql".'), { bicaCode: 'VALIDATION_ERROR' });
		}

		if (!scope || typeof scope !== 'string') {
			throw Object.assign(new Error('lookup requires a string "scope".'), { bicaCode: 'VALIDATION_ERROR' });
		}

		if (!operations || typeof operations !== 'object' || Array.isArray(operations)) {
			throw Object.assign(new Error('lookup requires an "operations" object.'), { bicaCode: 'VALIDATION_ERROR' });
		}

		const playbook = getPlaybook(scope);
		if (!playbook) {
			throw Object.assign(new Error(`Unknown lookup scope: '${scope}'.`), { bicaCode: 'VALIDATION_ERROR' });
		}

		const delegate = (prisma as any)[playbook.modelKey];
		if (!delegate) {
			throw Object.assign(new Error(`No Prisma delegate found for scope '${scope}'.`), { bicaCode: 'VALIDATION_ERROR' });
		}

		const whereScope = await this.resolveScope(scope);
		const { relationCardinality, relationFieldMap } = getPrismaRelationMetadata(playbook.modelKey);
		const searchDirectives = this.collectSearchDirectives(operations as JeqlQuery);

		let prismaArgs: JeqlCompiledQuery;
		try {
			prismaArgs = this.compiler.compile(operations as JeqlQuery, {
				baseWhere: whereScope,
				relationCardinality,
				relationFieldMap,
				modelKey: playbook.modelKey,
			});
		} catch (error: any) {
			if (error instanceof JeqlValidationError) {
				throw Object.assign(new Error(error.message), { bicaCode: 'VALIDATION_ERROR' });
			}
			throw Object.assign(new Error(`Failed to compile JEQL lookup: ${error.message || error}`), { bicaCode: 'SERVER_ERROR' });
		}

		let records: any[] = [];
		try {
			records = await delegate.findMany(prismaArgs);
		} catch (error: any) {
			throw Object.assign(new Error(`Failed to execute JEQL lookup: ${error.message || error}`), { bicaCode: 'SERVER_ERROR' });
		}

		const matches = records.map(record => ({
			id: record.id,
			_model: playbook.getModelName(),
			label: playbook.getLookupLabel(record),
			secondaryLabel: playbook.getLookupSecondaryLabel(record),
			confidence: searchDirectives.length > 0
				? Math.max(0, Math.min(1, this.calculateSearchConfidence(record, searchDirectives)))
				: 1,
		}));

		if (searchDirectives.length > 0 && !(operations as JeqlQuery).$orderBy) {
			matches.sort((left, right) => right.confidence - left.confidence);
		}

		return { matches };
	}

	private collectSearchDirectives(query: JeqlQuery): SearchDirective[] {
		const directives: SearchDirective[] = [];

		const visitConditions = (conditions?: JeqlQuery['$whereAll']) => {
			for (const condition of conditions ?? []) {
				if (Array.isArray(condition)) {
					const [fields, operator, value] = condition;
					if (operator === 'search' && typeof value === 'string' && value.trim()) {
						directives.push({
							fields: Array.isArray(fields) ? fields.map(String) : [String(fields)],
							term: value,
						});
					}
					continue;
				}

				if ('$whereAll' in condition) {
					visitConditions(condition.$whereAll);
				}
				if ('$whereAny' in condition) {
					visitConditions(condition.$whereAny);
				}
			}
		};

		visitConditions(query.$whereAll);
		visitConditions(query.$whereAny);

		return directives;
	}

	private calculateSearchConfidence(record: any, directives: SearchDirective[]): number {
		let bestScore = 0;

		for (const directive of directives) {
			const normalizedQuery = normalizeText(directive.term);
			if (!normalizedQuery) {
				continue;
			}

			for (const field of directive.fields) {
				const normalizedField = normalizeText(record?.[field]);
				if (!normalizedField) {
					continue;
				}

				bestScore = Math.max(bestScore, this.compareText(normalizedQuery, normalizedField));
			}
		}

		return Number(bestScore.toFixed(3));
	}

	private compareText(left: string, right: string): number {
		if (!left || !right) return 0;
		if (left === right) return 1;

		if (left.includes(right) || right.includes(left)) {
			const shorter = Math.min(left.length, right.length);
			const longer = Math.max(left.length, right.length);
			return Number((0.6 + (shorter / longer) * 0.4).toFixed(3));
		}

		const leftTokens = new Set(left.split(' ').filter(Boolean));
		const rightTokens = new Set(right.split(' ').filter(Boolean));
		if (!leftTokens.size || !rightTokens.size) return 0;

		let intersection = 0;
		for (const token of leftTokens) {
			if (rightTokens.has(token)) {
				intersection += 1;
			}
		}

		const union = new Set([...leftTokens, ...rightTokens]).size;
		return Number((intersection / union).toFixed(3));
	}
}
