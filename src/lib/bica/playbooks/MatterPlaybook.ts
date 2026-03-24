import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class MatterPlaybook extends Playbook {
  constructor() {
    super('matter');
  }

  getDescription(): string {
    return 'Represents a specific legal case or matter.';
  }

  getFieldComments(): Record<string, string> {
    return {
      caseNumber: 'Official court reference number.',
      name: 'Internal name of the matter.',
      court: 'Presiding court jurisdiction.',
      judge: 'Presiding judge.',
      opponentName: 'Opposing party.',
      opponentCounsel: 'Counsel representing the opponent.',
      status: 'Current status of the case.',
      nextCourtDate: 'Next hearing or court date.',
    };
  }

  getBaseValidationRules(): Record<string, any> {
    return {
      id: 'prohibited',
      caseNumber: 'nullable|string|max:255',
      name: 'required|string|max:255',
      court: 'nullable|string|max:255',
      judge: 'nullable|string|max:255',
      opponentName: 'nullable|string|max:255',
      opponentCounsel: 'nullable|string|max:255',
      status: 'required|in:active,closed,pending',
      nextCourtDate: 'nullable|date',
    };
  }

  getMutableChildRelationships(): string[] {
    return ['Brief', 'CalendarEntry', 'Task', 'MeetingRecording', 'Invoice'];
  }

  getLookupLabel(record: any): string {
    return record?.name || record?.caseNumber || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    return record?.caseNumber ? `Case: ${record.caseNumber}` : record?.status || '';
  }

  getSearchableFields(): string[] {
    return ['name', 'caseNumber'];
  }

  async resolve(id: string) {
    const rec = await prisma.matter.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`Matter not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return { OR: [{ lawyerInChargeId: actor.id }, { lawyers: { some: { lawyerId: actor.id } } }] };
    }
    return { workspaceId: actor.id };
  }
}