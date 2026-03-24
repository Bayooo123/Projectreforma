/**
 * Bica Label Configuration
 * 
 * Defines how Prismsa models are converted to human-readable labels and secondary labels.
 * If a model doesn't have a specific function here, it falls back to default logic.
 */

export type LabelFunction = (record: any) => string;

export interface ModelLabelConfig {
  label?: LabelFunction;
  secondaryLabel?: LabelFunction;
}

const CONFIG: Record<string, ModelLabelConfig> = {
  matter: {
    label: (r) => r.name || r.caseNumber || r.id,
    secondaryLabel: (r) => r.caseNumber ? `Case: ${r.caseNumber}` : r.status || '',
  },
  client: {
    label: (r) => r.name || r.company || r.id,
    secondaryLabel: (r) => r.company ? `Company: ${r.company}` : r.email || '',
  },
  task: {
    label: (r) => r.title || r.id,
    secondaryLabel: (r) => r.status ? `[${r.status}]` : '',
  },
  user: {
    label: (r) => r.name || r.email || r.id,
    secondaryLabel: (r) => r.email || '',
  }
};

export function getRecordLabel(modelKey: string, record: any): string {
  const model = modelKey.toLowerCase();
  const cfg = CONFIG[model] || CONFIG[model.slice(0, -1)]; // try singular
  
  if (cfg?.label) return cfg.label(record);
  
  // Default Fallback
  return record.name || record.title || record.caseNumber || record.briefNumber || record.id;
}

export function getRecordSecondaryLabel(modelKey: string, record: any): string {
  const model = modelKey.toLowerCase();
  const cfg = CONFIG[model] || CONFIG[model.slice(0, -1)];
  
  if (cfg?.secondaryLabel) return cfg.secondaryLabel(record);
  
  // Default Fallback
  const parts: string[] = [];
  if (record.status) parts.push(`[${record.status}]`);
  if (record.email) parts.push(record.email);
  return parts.join(' ').slice(0, 255);
}
