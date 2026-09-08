import { getRepository } from '../../cli/repositories/registry';
import { configuredBrainRoot } from '../../cli/commands/brain-root';
import { getWorkContract } from '../../../packages/kernel/work/api/index';
import type { ScopeRef } from '../../../packages/kernel/identity/api/index';
import { getControllerRoundRelay, getControllerSession } from '../../../packages/kernel/controller/api/index';
import { recordExperience, recordOutcomeObservation, queryExperiences, type ExperienceApplicability, type ExperienceDraft, type ExperienceRecord, type OutcomeObservation } from '../../../packages/kernel/memory/api/index';
import { controllerExperienceStore, controllerOutcomeObservationStore, experienceScopesForWork, type ExperienceWriteIdentity } from '../control-plane/persistence/experience-store';
import { listControlPlaneRecords } from '../control-plane/persistence/sqlite-store';
import { WORKFLOW_RUN_NAMESPACE, type WorkflowRunRecord } from '../control-plane/persistence/workflow-run-store';
import { loadProjectEngineeringContract } from './project-engineering-contract';
import { fileKnowledgeSourcePort, renderAssistantContext, resolveAssistantContext, type AssistantContextResolution } from './assistant-context';

function cleanApplicability(value: ExperienceApplicability | undefined): ExperienceApplicability | undefined {
  if (!value) return undefined;
  const next: ExperienceApplicability = {};
  for (const key of ['channel', 'account', 'locale'] as const) {
    const item = value[key]?.trim();
    if (item) next[key] = item;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function uniqueApplicability(values: Array<ExperienceApplicability | undefined>): { value?: ExperienceApplicability; ambiguous: boolean } {
  const unique = new Map<string, ExperienceApplicability>();
  for (const raw of values) {
    const value = cleanApplicability(raw);
    if (!value) continue;
    unique.set(JSON.stringify(value), value);
  }
  return unique.size === 1 ? { value: [...unique.values()][0], ambiguous: false } : { ambiguous: unique.size > 1 };
}

function publicationApplicability(controllerHome: string, workId: string): { value?: ExperienceApplicability; ambiguous: boolean } {
  const rows = listControlPlaneRecords<WorkflowRunRecord>(controllerHome, { namespace: WORKFLOW_RUN_NAMESPACE, scope: workId, limit: 100 });
  return uniqueApplicability(rows.map(row => row.value.publicationReceipt
    ? { channel: row.value.publicationReceipt.channel, account: row.value.publicationReceipt.account }
    : undefined));
}

function compatibleApplicability(left: ExperienceApplicability, right: ExperienceApplicability): boolean {
  return (['channel', 'account', 'locale'] as const).every(key => !left[key] || !right[key] || left[key] === right[key]);
}

function effectiveApplicability(input: { explicit?: ExperienceApplicability; declared: Array<ExperienceApplicability | undefined>; published: { value?: ExperienceApplicability; ambiguous: boolean } }): { value: ExperienceApplicability; conflict: boolean } {
  const explicit = cleanApplicability(input.explicit);
  if (explicit) return { value: explicit, conflict: false };
  const declared = uniqueApplicability(input.declared);
  if (input.published.ambiguous) return { value: {}, conflict: true };
  if (declared.ambiguous && !input.published.value) return { value: {}, conflict: true };
  if (declared.value && input.published.value && !compatibleApplicability(declared.value, input.published.value)) return { value: {}, conflict: true };
  return { value: { ...(declared.value ?? {}), ...(input.published.value ?? {}) }, conflict: false };
}

/** Shared by interactive context retrieval and every ControllerHost round. */
export function prepareAssistantWorkContext(input: {
  controllerHome: string; repoId: string; workId: string; query?: string; applicability?: ExperienceApplicability; now?: string;
}): AssistantContextResolution | undefined {
  const work = getWorkContract({ controllerHome: input.controllerHome, repoId: input.repoId }, input.workId);
  if (!work) throw new Error('ASSISTANT_CONTEXT_WORK_NOT_FOUND');
  const repository = getRepository(input.repoId, input.controllerHome);
  const repoRoot = repository.checkouts.find(checkout => checkout.checkoutId === work.checkoutId)?.canonicalRoot ?? repository.canonicalRoot;
  // Semantic Project identity comes from Work lineage/portable placement. The engineering contract is an optional knowledge-source contract, not identity authority.
  const scopes = experienceScopesForWork(work, input.controllerHome);
  const boundProject = scopes.find(scope => scope.kind === 'project')?.id;
  // Project knowledge is advisory enrichment. A Work that has not yet been
  // bound to a Project must still be able to claim and continue its durable
  // ControllerRound; missing optional context is not a lifecycle blocker.
  if (!boundProject) return undefined;
  const loaded = loadProjectEngineeringContract({ repoRoot, sourceRevision: 'working-tree', now: () => input.now ?? new Date().toISOString() });
  if (loaded.status === 'ready' && boundProject !== loaded.contract.projectId) throw new Error('ASSISTANT_CONTEXT_PROJECT_BINDING_MISMATCH');
  const now = input.now ?? new Date().toISOString();
  const sources = loaded.status === 'ready' ? loaded.contract.knowledgeSources ?? [] : [];
  const applicability = effectiveApplicability({
    explicit: input.applicability,
    declared: sources.map(source => source.applicability),
    published: publicationApplicability(input.controllerHome, work.workId),
  });
  const experiences = queryExperiences(controllerExperienceStore({ controllerHome: input.controllerHome, repoId: input.repoId, ...(input.now ? { now: () => input.now! } : {}) }), { scopes, applicability: applicability.value, now });
  return resolveAssistantContext({ projectId: boundProject, query: input.query ?? work.objective,
    sources,
    knowledge: fileKnowledgeSourcePort({ repoRoot, brainRoot: configuredBrainRoot(), sourceRevision: 'working-tree' }),
    experiences: experiences.records, gaps: [...experiences.gaps, ...(applicability.conflict ? ['assistant_context_applicability_conflict'] : [])], applicability: applicability.value, now });
}

export function renderAssistantWorkContext(input: Parameters<typeof prepareAssistantWorkContext>[0]): string | undefined {
  try {
    const context = prepareAssistantWorkContext(input);
    return context ? renderAssistantContext(context) : undefined;
  } catch (error) {
    return `Assistant context unavailable: ${error instanceof Error ? error.message.split(':')[0] : 'read_failed'}. Do not infer missing project facts or publish without required task constraints.`;
  }
}


export type ControllerOutcomeObservationDraft = Omit<OutcomeObservation, 'schemaVersion' | 'sourceWorkId' | 'sourceRoundId'>;
export type ControllerExperienceDraft = Omit<ExperienceDraft, 'sourceWorkId' | 'sourceRoundId'>;

function learningStoreOptions(input: { controllerHome: string; repoId: string; identity: ExperienceWriteIdentity; now?: string }) {
  return { controllerHome: input.controllerHome, repoId: input.repoId, identity: input.identity, ...(input.now ? { now: () => input.now! } : {}) };
}

function currentLearningRound(input: { controllerHome: string; repoId: string; identity: ExperienceWriteIdentity; now?: string }): { sourceWorkId: string; sourceRoundId: string } {
  const store = learningStoreOptions(input);
  const relay = getControllerRoundRelay(store, input.identity.workId);
  if (relay) {
    if (relay.status !== 'claimed' || relay.authorityId !== input.identity.authorityId) throw new Error('LEARNING_LOOP_CONTROLLER_ROUND_AUTHORITY_MISMATCH');
    return { sourceWorkId: input.identity.workId, sourceRoundId: `${relay.relayScopeId}:${relay.roundCount}` };
  }
  const owner = getControllerSession(store, input.identity.workId);
  if (!owner || owner.controllerId !== input.identity.controllerId || !owner.claimGeneration) throw new Error('LEARNING_LOOP_CONTROLLER_CLAIM_REQUIRED');
  return { sourceWorkId: input.identity.workId, sourceRoundId: `${input.identity.workId}:${owner.claimGeneration}` };
}

export function recordControllerOutcome(input: { controllerHome: string; repoId: string; identity: ExperienceWriteIdentity; draft: ControllerOutcomeObservationDraft; now?: string }): OutcomeObservation {
  const lineage = currentLearningRound(input);
  return recordOutcomeObservation(controllerOutcomeObservationStore(learningStoreOptions(input)), {
    ...input.draft, schemaVersion: 1, sourceWorkId: lineage.sourceWorkId, sourceRoundId: lineage.sourceRoundId,
  }, input.now);
}

function outcomeEvidenceWithObservedMetric(input: { controllerHome: string; repoId: string; identity: ExperienceWriteIdentity; scope: ScopeRef; evidenceRefs: readonly string[]; now?: string }): boolean {
  const store = controllerOutcomeObservationStore(learningStoreOptions(input));
  let foundOutcome = false;
  for (const ref of input.evidenceRefs) {
    const observation = store.read(input.scope, ref);
    if (!observation) continue;
    foundOutcome = true;
    if (observation.metrics.some(metric => metric.value !== null)) return true;
  }
  return !foundOutcome;
}

export function recordControllerExperience(input: { controllerHome: string; repoId: string; identity: ExperienceWriteIdentity; draft: ControllerExperienceDraft; qualityAdjustmentFingerprint?: string; now?: string }): ExperienceRecord {
  const lineage = currentLearningRound(input);
  let evidenceRefs = [...input.draft.evidenceRefs];
  if (input.qualityAdjustmentFingerprint) {
    const relay = getControllerRoundRelay(learningStoreOptions(input), input.identity.workId);
    const result = relay?.qualityAdjustmentResults?.find(candidate => candidate.fingerprint === input.qualityAdjustmentFingerprint);
    if (!result || result.outcome === 'inconclusive') throw new Error('EXPERIENCE_QUALITY_ADJUSTMENT_VERIFICATION_REQUIRED');
    evidenceRefs = [...new Set([...evidenceRefs, ...result.evidenceRefs])];
  } else if (!outcomeEvidenceWithObservedMetric({ ...input, scope: input.draft.scope, evidenceRefs })) {
    throw new Error('EXPERIENCE_OUTCOME_OBSERVED_METRIC_REQUIRED');
  }
  return recordExperience(controllerExperienceStore(learningStoreOptions(input)), {
    ...input.draft, evidenceRefs, sourceWorkId: lineage.sourceWorkId, sourceRoundId: lineage.sourceRoundId,
  }, input.now);
}
