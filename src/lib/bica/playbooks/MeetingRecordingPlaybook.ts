import { Playbook } from './Playbook';
import { prisma } from '@/lib/prisma';

export class MeetingRecordingPlaybook extends Playbook {
  constructor() {
    super('meetingrecording');
  }

  getDescription(): string {
    return 'Represents an AI-generated summary and action items from a recorded meeting or court session linked to a matter.';
  }

  getFieldComments(): Record<string, string> {
    return {
      summary: 'AI-generated or manually written summary of the meeting.',
      actionItems: 'Follow-up actions identified from the meeting.',
      date: 'Date the meeting or session took place.',
      followUpDate: 'Date by which follow-up actions should be completed.',
      participants: 'JSON list of participant names or identifiers.',
      audioDuration: 'Duration of the audio recording in seconds.',
    };
  }

  getBaseValidationRules(operation: string, forRecord?: any, parentEntity?: any): Record<string, any> {
    return {
      id: 'prohibited',
      calendarEntryId: 'nullable|string|max:255',
      matterId: 'nullable|string|max:255',
      summary: 'required|string',
      actionItems: 'nullable|string',
      date: 'nullable|date',
      followUpDate: 'nullable|date',
      participants: 'nullable|array',
      audioUrl: 'nullable|string|max:2048',
      transcriptText: 'nullable|string',
      audioDuration: 'nullable|integer|min:0',
      createdById: 'nullable|string|max:255',
      complianceTaskId: 'nullable|string|max:255',
    };
  }

  getMutableChildRelationships(): string[] {
    return [];
  }

  getCreateScope(parentEntity: any, parentEntityType: string): Record<string, unknown> {
    const t = String((parentEntityType || '')).toLowerCase();
    if (t === 'calendarentry') return { calendarEntryId: parentEntity.id, matterId: parentEntity.matterId };
    return { matterId: parentEntity.id };
  }

  getLookupLabel(record: any): string {
    if (record?.summary) {
      const s = String(record.summary);
      return s.length > 60 ? `${s.slice(0, 60)}\u2026` : s;
    }
    return record?.id;
  }

  getLookupSecondaryLabel(record: any): string {
    if (!record?.date) return '';
    return new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getSearchableFields(): string[] {
    return ['summary', 'actionItems'];
  }

  async resolve(id: string) {
    const rec = await prisma.meetingRecording.findUnique({ where: { id } });
    if (!rec) throw Object.assign(new Error(`MeetingRecording not found: ${id}`), { name: 'MorphEntityNotFoundError' });
    return rec;
  }

  getScopeFilter(actor: any, actorType: string) {
    const t = String((actorType || '')).toLowerCase();
    if (t === 'user') {
      return {
        OR: [
          { createdById: actor.id },
          { matter: { OR: [{ lawyerInChargeId: actor.id }, { lawyers: { some: { lawyerId: actor.id } } }] } },
        ],
      };
    }
    return { matter: { workspaceId: actor.id } };
  }

  getPreviewIncludes(): Record<string, unknown> {
    return { matter: { select: { name: true } } };
  }

  getPreviewHtml(record: any): string {
    const durationMins = record.audioDuration ? `${Math.round(record.audioDuration / 60)} min` : undefined;
    return this.buildCard(
      record.summary ? this.truncate(record.summary, 60) : record.id,
      'Meeting Recording',
      [
        ['Date',         this.formatDate(record.date)],
        ['Matter',       record.matter?.name],
        ['Duration',     durationMins],
        ['Follow-Up',    this.formatDate(record.followUpDate)],
        ['Summary',      record.summary ? this.truncate(record.summary, 200) : undefined],
        ['Action Items', record.actionItems ? this.truncate(record.actionItems, 200) : undefined],
      ],
    );
  }
}
