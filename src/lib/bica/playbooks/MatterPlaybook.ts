import { Playbook } from './Playbook';

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
}