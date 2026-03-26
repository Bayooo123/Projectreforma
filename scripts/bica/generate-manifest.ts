import { readFile, readdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

import { listPlaybooks } from '@/lib/bica/playbooks';

type ManifestField = {
  description: string;
  validation_rules: string;
};

type ManifestProtocol = {
  title: string;
  content: string;
};

type StaticManifest = {
  identity: Record<string, unknown>;
  branding: Record<string, unknown>;
  endpoints: Record<string, unknown>;
  conversation?: Record<string, unknown>;
};

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const rootDir = path.resolve(currentDir, '..', '..');
const manifestYamlPath = path.join(rootDir, 'bica-integration', 'platform_manifest.yaml');
const manifestJsonPath = path.join(rootDir, 'bica-integration', 'platform.json');
const protocolsDir = path.join(rootDir, 'src', 'lib', 'bica', 'protocols');

function toProtocolTitle(fileName: string): string {
  const stem = fileName.replace(/\.md$/i, '');
  const acronyms = new Set(['api', 'db', 'id', 'io', 'json', 'mfa', 'ocr', 'pdf', 'rbac', 'sql', 'ui', 'url']);

  return stem
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => (acronyms.has(part.toLowerCase()) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

function normalizeValidationRules(rules: unknown): Record<string, string> {
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [fieldName, ruleValue] of Object.entries(rules as Record<string, unknown>)) {
    if (fieldName.includes('*')) {
      continue;
    }

    if (typeof ruleValue === 'string') {
      normalized[fieldName] = ruleValue;
      continue;
    }

    if (Array.isArray(ruleValue)) {
      normalized[fieldName] = ruleValue.map(String).join('|');
      continue;
    }

    if (ruleValue != null) {
      normalized[fieldName] = String(ruleValue);
    }
  }

  return normalized;
}

function buildPlaybookFields(playbook: ReturnType<typeof listPlaybooks>[number]): Record<string, ManifestField> {
  const validationRules = normalizeValidationRules(playbook.getBaseValidationRules('create'));
  const fieldComments = playbook.getFieldComments();
  const fields: Record<string, ManifestField> = {};

  for (const [fieldName, validationRule] of Object.entries(validationRules)) {
    fields[fieldName] = {
      description: fieldComments[fieldName] ?? fieldName,
      validation_rules: validationRule,
    };
  }

  return fields;
}

function buildManifestPlaybooks() {
  return Object.fromEntries(
    listPlaybooks()
      .filter(playbook => playbook.isManifestPublic())
      .sort((left, right) => left.getModelName().localeCompare(right.getModelName()))
      .map(playbook => [
        playbook.getModelName(),
        {
          name: playbook.getModelName(),
          description: playbook.getDescription(),
          fields: buildPlaybookFields(playbook),
          child_relationships: playbook.getChildRelationships(),
        },
      ]),
  );
}

function buildModelParentageMap() {
  return Object.fromEntries(
    listPlaybooks()
      .filter(playbook => playbook.isManifestPublic())
      .sort((left, right) => left.getModelName().localeCompare(right.getModelName()))
      .map(playbook => [playbook.getModelName(), playbook.getChildRelationships()])
      .filter(([, children]) => Array.isArray(children) && children.length > 0),
  );
}

async function buildProtocols(): Promise<Record<string, ManifestProtocol>> {
  const protocolEntries: Record<string, ManifestProtocol> = {};
  const directoryEntries = await readdir(protocolsDir, { withFileTypes: true });

  for (const entry of directoryEntries.filter(item => item.isFile() && item.name.toLowerCase().endsWith('.md')).sort((left, right) => left.name.localeCompare(right.name))) {
    const fileName = entry.name;
    const slug = fileName.replace(/\.md$/i, '');
    const content = (await readFile(path.join(protocolsDir, fileName), 'utf8')).trim();

    protocolEntries[slug] = {
      title: toProtocolTitle(fileName),
      content,
    };
  }

  return protocolEntries;
}

async function main() {
  const rawYaml = await readFile(manifestYamlPath, 'utf8');
  const staticManifest = yaml.load(rawYaml) as StaticManifest;

  const manifest = {
    identity: staticManifest.identity,
    branding: staticManifest.branding,
    knowledge: {
      playbooks: buildManifestPlaybooks(),
      model_parentage_map: buildModelParentageMap(),
      protocols: await buildProtocols(),
    },
    endpoints: staticManifest.endpoints,
    conversation: staticManifest.conversation ?? {},
  };

  await writeFile(manifestJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});