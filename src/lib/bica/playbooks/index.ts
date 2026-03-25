import { ClientPlaybook } from './ClientPlaybook';
import { MatterPlaybook } from './MatterPlaybook';
import { Playbook } from './Playbook';
import { WorkspacePlaybook } from './WorkspacePlaybook';
import { TaskPlaybook } from './TaskPlaybook';
import { UserPlaybook } from './UserPlaybook';

const PLAYBOOKS: Record<string, Playbook> = {
  client: new ClientPlaybook(),
  matter: new MatterPlaybook(),
  task: new TaskPlaybook(),
  workspace: new WorkspacePlaybook(),
  user: new UserPlaybook(),
};

export class UnknownPlaybookError extends Error {
  constructor(name: string) {
    super(`Unknown Bica playbook: "${name}". Registered playbooks: ${Object.keys(PLAYBOOKS).join(', ')}.`);
    this.name = 'UnknownPlaybookError';
  }
}

export function normalizePlaybookKey(name: string): string {
  const trimmed = String(name || '').trim().toLowerCase();
  if (!trimmed) return '';
  if (PLAYBOOKS[trimmed]) return trimmed;
  if (trimmed.endsWith('s')) {
    const singular = trimmed.slice(0, -1);
    if (PLAYBOOKS[singular]) return singular;
  }
  const plural = `${trimmed}s`;
  if (PLAYBOOKS[plural]) return plural;
  return trimmed;
}

export function getPlaybook(name: string): Playbook | null {
  const key = normalizePlaybookKey(name);
  return PLAYBOOKS[key] || null;
}

export function getPlaybookOrThrow(name: string): Playbook {
  const playbook = getPlaybook(name);
  if (!playbook) throw new UnknownPlaybookError(name);
  return playbook;
}

export function listPlaybooks(): Playbook[] {
  return Object.values(PLAYBOOKS);
}

export { Playbook } from './Playbook';
export { ClientPlaybook } from './ClientPlaybook';
export { MatterPlaybook } from './MatterPlaybook';
export { TaskPlaybook } from './TaskPlaybook';
export { WorkspacePlaybook } from './WorkspacePlaybook';
export { UserPlaybook } from './UserPlaybook';