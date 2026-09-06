import { createHash } from 'crypto';

export const WORKFLOW_ASSET_SCHEMA_VERSION = 1 as const;
export const WORKFLOW_CONTENT_DIGEST_PREFIX = 'sha256:' as const;

export type WorkflowJsonValue = null | boolean | number | string | WorkflowJsonValue[] | { [key: string]: WorkflowJsonValue };

export interface WorkflowCredentialReference {
  /** Existing credential authority reference. Never inline a secret value here. */
  credentialRef: string;
}

export interface WorkflowDeterministicScript {
  runtime: 'shell' | 'node' | 'python';
  body: string;
  deterministic: true;
}

export interface WorkflowStepDefinition {
  stepId: string;
  capabilityId: string;
  input?: Record<string, WorkflowJsonValue>;
  idempotency?: 'idempotent' | 'non_idempotent';
  reconcileWithCapabilityId?: string;
}

export interface WorkflowAssetDefinition {
  schemaVersion: typeof WORKFLOW_ASSET_SCHEMA_VERSION;
  workflowId: string;
  version: string;
  title?: string;
  description?: string;
  inputs?: Record<string, WorkflowJsonValue>;
  credentialRefs?: Record<string, WorkflowCredentialReference>;
  requiredCapabilities?: string[];
  steps: WorkflowStepDefinition[];
  prompts?: Record<string, string>;
  scripts?: Record<string, WorkflowDeterministicScript>;
  templates?: Record<string, string>;
  selectors?: Record<string, string>;
  resources?: Record<string, string>;
  contentDigest: string;
}

export type WorkflowAssetDraft = Omit<WorkflowAssetDefinition, 'contentDigest'>;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, canonical(entry)]));
}

function requireBoundedId(value: string, label: string, pattern = ID_PATTERN): void {
  if (!pattern.test(value)) throw new Error(`WORKFLOW_ASSET_${label.toUpperCase()}_INVALID: ${value}`);
}

function requireRecordStrings(value: Record<string, string> | undefined, label: string): void {
  if (!value) return;
  for (const [key, entry] of Object.entries(value)) {
    requireBoundedId(key, `${label}_key`);
    if (typeof entry !== 'string') throw new Error(`WORKFLOW_ASSET_${label.toUpperCase()}_VALUE_INVALID: ${key}`);
  }
}

export function workflowAssetContentDigest(asset: WorkflowAssetDraft | WorkflowAssetDefinition): string {
  const { contentDigest: _ignored, ...content } = asset as WorkflowAssetDefinition;
  const json = JSON.stringify(canonical(content));
  return `${WORKFLOW_CONTENT_DIGEST_PREFIX}${createHash('sha256').update(json).digest('hex')}`;
}

export function validateWorkflowAsset(asset: WorkflowAssetDefinition): WorkflowAssetDefinition {
  if (asset.schemaVersion !== WORKFLOW_ASSET_SCHEMA_VERSION) throw new Error('WORKFLOW_ASSET_SCHEMA_VERSION_UNSUPPORTED');
  requireBoundedId(asset.workflowId, 'workflow_id');
  requireBoundedId(asset.version, 'version', VERSION_PATTERN);
  if (!DIGEST_PATTERN.test(asset.contentDigest)) throw new Error('WORKFLOW_ASSET_CONTENT_DIGEST_INVALID');
  if (workflowAssetContentDigest(asset) !== asset.contentDigest) throw new Error('WORKFLOW_ASSET_CONTENT_DIGEST_MISMATCH');
  if (!Array.isArray(asset.steps) || asset.steps.length === 0) throw new Error('WORKFLOW_ASSET_STEPS_REQUIRED');

  const stepIds = new Set<string>();
  for (const step of asset.steps) {
    requireBoundedId(step.stepId, 'step_id');
    requireBoundedId(step.capabilityId, 'capability_id');
    if (stepIds.has(step.stepId)) throw new Error(`WORKFLOW_ASSET_STEP_DUPLICATE: ${step.stepId}`);
    stepIds.add(step.stepId);
    if (step.idempotency === 'non_idempotent' && !step.reconcileWithCapabilityId) {
      throw new Error(`WORKFLOW_ASSET_NON_IDEMPOTENT_RECONCILIATION_REQUIRED: ${step.stepId}`);
    }
    if (step.reconcileWithCapabilityId) requireBoundedId(step.reconcileWithCapabilityId, 'reconcile_capability_id');
  }

  for (const capabilityId of asset.requiredCapabilities ?? []) requireBoundedId(capabilityId, 'required_capability_id');
  for (const [name, ref] of Object.entries(asset.credentialRefs ?? {})) {
    requireBoundedId(name, 'credential_ref_key');
    if (!ref || typeof ref.credentialRef !== 'string' || !ref.credentialRef.trim() || ref.credentialRef.length > 512) {
      throw new Error(`WORKFLOW_ASSET_CREDENTIAL_REFERENCE_INVALID: ${name}`);
    }
  }
  for (const [name, script] of Object.entries(asset.scripts ?? {})) {
    requireBoundedId(name, 'script_key');
    if (!script || script.deterministic !== true || !['shell', 'node', 'python'].includes(script.runtime) || typeof script.body !== 'string') {
      throw new Error(`WORKFLOW_ASSET_SCRIPT_INVALID: ${name}`);
    }
  }
  requireRecordStrings(asset.prompts, 'prompt');
  requireRecordStrings(asset.templates, 'template');
  requireRecordStrings(asset.selectors, 'selector');
  requireRecordStrings(asset.resources, 'resource');
  return asset;
}

export function materializeWorkflowAsset(draft: WorkflowAssetDraft): WorkflowAssetDefinition {
  const asset: WorkflowAssetDefinition = { ...draft, contentDigest: workflowAssetContentDigest(draft) };
  return validateWorkflowAsset(asset);
}

export interface WorkflowContentIdentity {
  workflowId: string;
  version: string;
  contentDigest: string;
}

export function workflowContentIdentity(asset: WorkflowAssetDefinition): WorkflowContentIdentity {
  validateWorkflowAsset(asset);
  return { workflowId: asset.workflowId, version: asset.version, contentDigest: asset.contentDigest };
}

export function sameWorkflowContentIdentity(left: WorkflowContentIdentity, right: WorkflowContentIdentity): boolean {
  return left.workflowId === right.workflowId && left.version === right.version && left.contentDigest === right.contentDigest;
}
