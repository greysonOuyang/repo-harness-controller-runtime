import { getRepository } from '../../cli/repositories/registry';
import { configuredBrainRoot } from '../../cli/commands/brain-root';
import { getWorkContract } from '../../../packages/kernel/work/api/index';
import { queryExperiences, type ExperienceApplicability } from '../../../packages/kernel/memory/api/index';
import { controllerExperienceStore, experienceScopesForWork } from '../control-plane/persistence/experience-store';
import { loadProjectEngineeringContract } from './project-engineering-contract';
import { fileKnowledgeSourcePort, renderAssistantContext, resolveAssistantContext, type AssistantContextResolution } from './assistant-context';

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
  if (!boundProject) throw new Error('ASSISTANT_CONTEXT_PROJECT_BINDING_REQUIRED');
  const loaded = loadProjectEngineeringContract({ repoRoot, sourceRevision: 'working-tree', now: () => input.now ?? new Date().toISOString() });
  if (loaded.status === 'ready' && boundProject !== loaded.contract.projectId) throw new Error('ASSISTANT_CONTEXT_PROJECT_BINDING_MISMATCH');
  const now = input.now ?? new Date().toISOString();
  const experiences = queryExperiences(controllerExperienceStore(input), { scopes, applicability: input.applicability ?? {}, now });
  return resolveAssistantContext({ projectId: boundProject, query: input.query ?? work.objective,
    sources: loaded.status === 'ready' ? loaded.contract.knowledgeSources ?? [] : [],
    knowledge: fileKnowledgeSourcePort({ repoRoot, brainRoot: configuredBrainRoot(), sourceRevision: 'working-tree' }),
    experiences: experiences.records, gaps: experiences.gaps, applicability: input.applicability, now });
}

export function renderAssistantWorkContext(input: Parameters<typeof prepareAssistantWorkContext>[0]): string | undefined {
  try {
    const context = prepareAssistantWorkContext(input);
    return context ? renderAssistantContext(context) : undefined;
  } catch (error) {
    return `Assistant context unavailable: ${error instanceof Error ? error.message.split(':')[0] : 'read_failed'}. Do not infer missing project facts or publish without required task constraints.`;
  }
}
