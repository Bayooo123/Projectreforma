import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class CalendarEntryPlaybook extends Playbook {
  constructor() {
    super('calendarentry');
  }

  getDescription(): string {
    return 'Represents a scheduled event for a matter — including court dates, filing deadlines, client meetings, and internal meetings.';
  }

  getFieldComments(): Record<string, string> {
    return {
      title: 'Short description or title of the event.',
      date: 'The date and time of the event.',
      type: 'Event type: COURT_DATE, FILING_DEADLINE, CLIENT_MEETING, INTERNAL_MEETING, or OTHER.',
      location: 'Physical or virtual location of the event.',
      judge: 'Presiding judge (for court dates).',
      agenda: 'Agenda or purpose of the event.',
      proceedings: 'What transpired during the event.',
      outcome: 'Result or decision from the event.',
      adjournedFor: 'Reason for adjournment, if applicable.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      matterId: 'nullable|string|max:255',
      title: 'required|string|max:255',
      date: 'required|date',
      proceedings: 'nullable|string',
      outcome: 'nullable|string',
      adjournedFor: 'nullable|string',
      submittingLawyerId: 'nullable|string|max:255',
      submittingLawyerToken: 'nullable|string|max:255',
      submittingLawyerName: 'nullable|string|max:255',
      briefId: 'nullable|string|max:255',
      clientId: 'nullable|string|max:255',
      externalCounsel: 'nullable|string|max:255',
      type: 'nullable|in:COURT_DATE,FILING_DEADLINE,CLIENT_MEETING,INTERNAL_MEETING,OTHER',
      location: 'nullable|string|max:255',
      judge: 'nullable|string|max:255',
      agenda: 'nullable|string',
      description: 'nullable|string',
    };
  }

  getMutableChildRelationships(): string[] {
    return ['MeetingRecording'];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    return { matterId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    return record?.title || record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    const type = record?.type ? record.type.replace(/_/g, ' ') : '';
    const date = record?.date ? new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return [type, date].filter(Boolean).join(' - ');
  }

  getSearchableFields(): string[] {
    return ['title', 'proceedings', 'outcome'];
  }

  async resolve(id: string) {
    const rec = await prisma.calendarEntry.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`CalendarEntry not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return {
        OR: [
          { appearances: { some: { id: actor.id } } },
          { matter: { OR: [{ lawyerInChargeId: actor.id }, { lawyers: { some: { lawyerId: actor.id } } }] } },
        ],
      };
    }
    return { matter: { workspaceId: actor.id } };
  }

  getPreviewIncludes(): Record<string, unknown> {
    return { matter: { select: { name: true, caseNumber: true } } };
  }

  getPreviewHtml(record: any): string {
    const typeLabel = record?.type ? record.type.replace(/_/g, ' ') : undefined;
    return this.buildCard(
      record.title || record.id,
      'Calendar Entry',
      [
        ['Type',         typeLabel],
        ['Date',         this.formatDate(record.date)],
        ['Matter',       record.matter?.name],
        ['Location',     record.location],
        ['Judge',        record.judge],
        ['Agenda',       record.agenda ? this.truncate(record.agenda, 120) : undefined],
        ['Proceedings',  record.proceedings ? this.truncate(record.proceedings, 120) : undefined],
        ['Outcome',      record.outcome ? this.truncate(record.outcome, 120) : undefined],
        ['Adjourned For', record.adjournedFor],
      ],
    );
  }
}
