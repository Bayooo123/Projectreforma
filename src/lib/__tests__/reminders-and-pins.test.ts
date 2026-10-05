import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { reminderStageFor } from '../compliance-reminders';
import { createHash } from 'node:crypto';

import { hashPin, verifyStoredPin } from '../workspace-pins';

const now = new Date('2026-10-03T07:30:00Z');
const due = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('reminderStageFor', () => {
  it('reminds 7, 3, 1 and 0 days before the due date only', () => {
    expect(reminderStageFor(due('2026-10-10'), now)).toEqual({ kind: 'upcoming', daysUntilDue: 7 });
    expect(reminderStageFor(due('2026-10-06'), now)).toEqual({ kind: 'upcoming', daysUntilDue: 3 });
    expect(reminderStageFor(due('2026-10-04'), now)).toEqual({ kind: 'upcoming', daysUntilDue: 1 });
    expect(reminderStageFor(due('2026-10-03'), now)).toEqual({ kind: 'upcoming', daysUntilDue: 0 });
    expect(reminderStageFor(due('2026-10-05'), now)).toBeNull();
    expect(reminderStageFor(due('2026-10-20'), now)).toBeNull();
  });

  it('escalates the day after, then weekly', () => {
    expect(reminderStageFor(due('2026-10-02'), now)).toEqual({ kind: 'overdue', daysOverdue: 1 });
    expect(reminderStageFor(due('2026-10-01'), now)).toBeNull();
    expect(reminderStageFor(due('2026-09-26'), now)).toEqual({ kind: 'overdue', daysOverdue: 7 });
    expect(reminderStageFor(due('2026-09-19'), now)).toEqual({ kind: 'overdue', daysOverdue: 14 });
  });
});

describe('verifyStoredPin', () => {
  it('verifies bcrypt hashes without asking for a rehash', async () => {
    const stored = await hashPin('12345');
    await expect(verifyStoredPin('12345', stored)).resolves.toEqual({ valid: true, needsRehash: false });
    await expect(verifyStoredPin('99999', stored)).resolves.toEqual({ valid: false, needsRehash: false });
  });

  it('accepts legacy SHA-256 and plaintext PINs and flags them for rehashing', async () => {
    const sha = createHash('sha256').update('0987').digest('hex');
    await expect(verifyStoredPin('0987', sha)).resolves.toEqual({ valid: true, needsRehash: true });
    await expect(verifyStoredPin('1111', sha)).resolves.toEqual({ valid: false, needsRehash: false });
    await expect(verifyStoredPin('12345', '12345')).resolves.toEqual({ valid: true, needsRehash: true });
    await expect(verifyStoredPin('99999', '12345')).resolves.toEqual({ valid: false, needsRehash: false });
    await expect(verifyStoredPin('12345', null)).resolves.toEqual({ valid: false, needsRehash: false });
  });
});
