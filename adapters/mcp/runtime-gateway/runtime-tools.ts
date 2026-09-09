import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import { collectRuntimePerformanceDiagnostics, inferLocalControllerProcess } from '../../../src/runtime/diagnostics/performance';
import { defaultSemanticProviderRegistry, type SemanticNavigationKind, type SemanticNavigationRequest } from '../../../src/runtime/context/semantic-navigation';
import { buildContextClosureReceipt } from '../../../src/runtime/context/context-closure';
import type { McpToolDefinition, CallToolResult } from '../../../packages/protocols/mcp/tool-contract';
import type { MultiRepositoryMcpToolContext } from '../multi-repository';
import { allControllerToolDefinitions, controllerExposureSnapshot, controllerToolSurfaceStatus } from '../toolset';
import { legacyIosPluginInvocation } from './legacy-ios-tool-adapter';
import { boundedPluginArtifactImageContent, jsonPreview, result, resultWithPluginArtifactImages } from './result-adapter';
import { expectedRevision, repositoryRootForRepoId, selected, stringList } from './shared-adapter';
import { callContextAdapter } from './context-adapter';import { callPluginAdapter } from './plugin-adapter';import { callRecoveryAdapter } from './recovery-adapter';import { callArtifactAdapter } from './artifact-adapter';import { callFilesystemAdapter } from './filesystem-adapter';import { callModelAdapter } from './model-adapter';import { ageMs, callStatusInboxAdapter, controllerReadinessEvidence, GIT_IDENTITY_SAMPLE_TTL_MS, localControllerDiagnosticMatchesRuntime, probeLocalControllerHealth, runtimeSourceSnapshotStatus, summarizeInvalidActiveWorkCandidate, summarizeWorkListItem, type ControllerReadinessSignals } from './status-inbox-adapter';
export { boundedPluginArtifactImageContent } from './result-adapter';
import { repositoryScopedToolArgs } from '../multi-repository';
import { resolveMcpPath } from '../paths';
import { freshGitIdentity } from '../../../src/cli/repository/inspector';
import { runProcess } from '../../../src/effects/process-runner';
import { reconcileReadinessProjectionSource } from '../readiness-projection';import { listRepositories, repositorySummary, resolveRepositorySelection } from '../../../src/cli/repositories/registry';
import { repositoryControllerRoot } from '../../../src/cli/repositories/controller-home';
import { cancelExecutionJob, findExecutionJob, getExecutionJob, getExecutionJobByRequestId, listExecutionJobs } from '../../../src/runtime/execution/jobs/store';
import { waitForExecutionJob } from '../../../src/runtime/execution/jobs/wait';
import type { ExecutionJob } from '../../../src/runtime/execution/jobs/types';import { getProcessHandle, listRecoverableProcessRecords, processRuntimeResourceDiagnostics } from '../../../src/runtime/execution/process-runtime';
export { classifyTerminalCheckEvidence } from '../../../src/runtime/execution/process-runtime/check-result';
import { getRepositoryCommandProcess, waitRepositoryCommandProcess } from '../../../src/runtime/execution/process-runtime/command-facade';
import { buildJobOperationDigest } from '../../../src/runtime/control-plane/facade/operation-digest';import { readWorkHandle, transitionWorkHandle, type WorkHandleState } from '../../../src/runtime/control-plane/execution/work-handle-store';import { completeReviewedDirectEditWorkAfterCommit, prepareReviewedDirectEditWorkCommit, type ReviewedDirectEditWorkCommitPlan } from '../../../src/runtime/control-plane/execution/direct-edit-work-completion';
import { readJobEvents } from '../../../src/runtime/evidence/event-ledger';
import { readExecutionArtifact } from '../../../src/runtime/evidence/artifact-store';
import { readExecutionEvidence } from '../../../src/runtime/evidence/evidence-store';
import { readForgeRuntimeStatus } from '../../../src/runtime/control-plane/runtime-status-client';
import { readSchedulerHealthSnapshot } from '../../../src/runtime/control-plane/global-scheduler/scheduler';
import {
  evaluateActiveRuntimeSourceDrift,
  formatRuntimeSourceDriftMessage,
  readRuntimeGeneration,
  type RuntimeSourceIdentity,
} from '../../../src/runtime/control-plane/runtime-generation';
import { rebuildRepositoryProjection, projectionObservation, readRepositoryProjectionSnapshot, reconcileProjectionWithTaskLedger } from '../../../src/runtime/projections/materialized-view';
import {
  buildRuntimeOperationalView,
  classifyRuntimeReadinessSemantics,
  evaluateRuntimeHealth,
  RUNTIME_HEALTH_THRESHOLDS,
  type RuntimeHealthEvaluation,
  type RuntimeOperationalView,
  type GradedObservation,
} from '../../../src/runtime/health';import { applyScheduleDedupe, buildScheduleDedupeReport } from '../../../packages/kernel/scheduler/api/index';import { handoffResolvedContinuationEventName, triggerWorkContinuationRepositoryEvent } from '../../../src/runtime/workflow/schedules/work-continuation';
import { ensureRepositoryRuntimeStorage } from '../../../src/cli/repositories/runtime-storage';
import { assessWorkMode, parseExplicitTaskMode } from '../../../src/cli/controller/work-mode';
import { projectBoard } from '../../../src/cli/controller/issue-store';
import { buildControllerTaskLedgerProjection } from '../../../src/cli/controller/task-ledger';
import { buildControllerContextPack, buildControllerContextPackAsync, CONTROLLER_CONTEXT_IMPACT_DOMAINS, type ControllerContextImpactDomain } from '../../../src/cli/controller/context-pack';
import { legacyIssueAuthorityRetired } from '../../../src/cli/controller/legacy-issue-cutover';
import { buildControllerOperationalPlan } from '../../../src/cli/controller/operational-plan';
import { listControllerChecks, readLatestControllerCheckEvidence } from '../../../src/cli/controller/check-runner';
import { buildCheckExecutionSchedule } from '../../../src/runtime/execution/process-runtime/check-scheduling';
import { repositoryChangeVerify } from '../../../src/cli/controller/composite-operations';
import { listActiveAgentJobSnapshots } from '../../../src/cli/agent-jobs/job-manager';
import { readAgentExecutableReadinessSnapshot } from '../../../src/cli/agent-jobs/executable-resolver';
import {
  commitSelectedPaths,
  selectedPathDiff,
  stageSelectedPaths,
} from '../../../src/cli/repositories/selected-path-actions';
import type { TaskRisk } from '../../../src/cli/controller/types';
import {
  controllerContextPerformanceSnapshot,
  controllerContextProjectionAgeMs,
  controllerContextProjectionGeneration,
  controllerContextProjectionPayloadMatchesSourceIdentity,
  controllerContextProjectionNeedsRefresh,
  queueControllerContextProjectionRefresh,
  readControllerContextProjection,
  readControllerContextProjectionInvalidation,
  recordControllerContextRead,
  writeControllerContextProjection,
} from '../../../src/runtime/projections/controller-context';
import { loadMcpRuntimeState } from '../auth';
import {
  FORGE_MCP_SCHEMA_VERSION,
  FORGE_TOOL_SURFACE,
  FORGE_VERSION,
} from '../../../src/cli/controller/runtime-config';
import { resolveLocalBridgeSurface, summarizeRecentJobs } from '../../../src/runtime/shared/local-bridge-surface';import { listAssistantPluginManifests } from '../../../src/runtime/plugins/store';
import {
  summarizeExecutionJobForMcp,
  summarizeJobResultForLowInterception,
  summarizePluginForLowInterception,
} from '../../../src/runtime/safe-tooling';
import { sessionCacheGlobalDiagnostics } from '../../../src/cli/repository/session-cache';
import { cachedGitIdentity, gitIdentityPerformanceSnapshot, gitSnapshot, gitSnapshotPerformanceSnapshot } from '../../../src/cli/repository/inspector';
import { buildWorkflowWatchdogReport } from '../../../src/runtime/watchdog/workflow-watchdog';
import { applyRuntimeCleanup, previewRuntimeCleanup } from '../../../src/runtime/maintenance/cleanup';
import {
  getLocalBridgeJobEventsSnapshot,
  getLocalBridgeJobSnapshot,
  listLocalBridgeJobSnapshots,
  readLocalBridgeJobOutputSnapshot,
} from '../../../src/cli/local-bridge/job-store';import { acknowledgeHandoffItem, createHandoffItem, countHandoffItems, dismissHandoffItem, listCapabilityDescriptors, getCapabilityDescriptor, getPluginActionCapabilitySchema, searchCapabilityDescriptors, summarizeCapabilityGroups, listHandoffItems, runHandoffInboxApplication, summarizeHandoffItem, buildWorkContinuationSnapshot, type FacadeTool } from '../../../src/runtime/control-plane/facade';
import {
  getWorkContract,
  getWorkContractByRequestId,
  listWorkContracts,
  readActiveWorkCandidates,
  type InvalidActiveWorkCandidate,
} from '../../../packages/kernel/work/api/index';import { currentControllerInstanceId } from '../../../src/runtime/control-plane/execution/session-store';
import { reconcileWorkValidation } from './work-validation-reconciler';import { runStandaloneChatgptPrompt } from '../../../src/runtime/control-plane/launcher/chatgpt-work-continuation';import { claimControllerSession } from '../../../packages/kernel/controller/api/index';

export {
  connectorExposedTools,
  currentCallableTools,
  runtimeToolDefinitions,
} from './runtime-tool-definitions';
import {
  currentCallableTools,
  runtimeToolDefinitions,
} from './runtime-tool-definitions';
import { callWorkAdapter, contextRecord, contextText, runFacadeRepair, runtimeIdentitySnapshot } from './work-adapter';
import { callStandaloneRecoveryTool } from './recovery-client-adapter';

const RH_CONTEXT_CURRENT_WINDOW_MS = 24 * 60 * 60 * 1_000;

function timestampIsCurrent(value: string | undefined, cutoffMs: number): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= cutoffMs;
}

function isCurrentRhContextWork(
  contract: { status: string; updatedAt?: string },
  cutoffMs: number,
): boolean {
  if (contract.status === 'running') return true;
  if (contract.status !== 'ready' && contract.status !== 'open' && contract.status !== 'blocked') return false;
  return timestampIsCurrent(contract.updatedAt, cutoffMs);
}

function rhContextReadSessionId(ctx: MultiRepositoryMcpToolContext): string | undefined {
  const principal = ctx.principalId?.trim();
  if (principal) {
    const controllerInstance = ctx.controllerInstanceId?.trim() || currentControllerInstanceId();
    return `controller:${principal}:${controllerInstance}`;
  }
  const transportSession = ctx.sessionId?.trim();
  return transportSession ? `transport:${transportSession}` : undefined;
}

const RH_CONTEXT_SEMANTIC_QUERY_LIMIT = 8;
const RH_CONTEXT_SEMANTIC_LOCATION_LIMIT = 200;
const RH_CONTEXT_LEGACY_SEMANTIC_SYNTAX = '@tsnav references <repo-path>:<line>:<column> | @swiftnav references <repo-path>:<line>:<column>';

type RhContextSemanticNavigationRequest = {
  navigation: SemanticNavigationKind;
  path: string;
  line: number;
  column: number;
  tsconfig_path?: string;
  language?: string;
};

function rhContextLegacySemanticQuery(query: string): {
  retrievalQuery: string;
  requests: RhContextSemanticNavigationRequest[];
} {
  const requests: RhContextSemanticNavigationRequest[] = [];
  const directive = /(?:^|\s)@(tsnav|swiftnav)\s+(definition|references|implementations)\s+([^\s]+):(\d+):(\d+)(?:\s+tsconfig=([^\s]+))?/gi;
  const retrievalQuery = query.replace(directive, (_match, directiveKind, navigation, path, line, column, tsconfigPath) => {
    const language = String(directiveKind).toLowerCase() === 'swiftnav' ? 'swift' : 'typescript';
    requests.push({
      navigation: String(navigation).toLowerCase() as SemanticNavigationKind,
      path: String(path),
      line: Number(line),
      column: Number(column),
      language,
      ...(tsconfigPath ? { tsconfig_path: String(tsconfigPath) } : {}),
    });
    return ' ';
  }).replace(/\s+/g, ' ').trim();
  const fallback = requests.length > 0
    ? `${requests[0]!.language === 'swift' ? 'Swift' : 'TypeScript'} ${requests[0]!.navigation} ${requests[0]!.path}`
    : query;
  return { retrievalQuery: retrievalQuery || fallback, requests };
}

interface RhContextSemanticNavigationProjection {
  requested: number;
  executed: number;
  results: Record<string, unknown>[];
  errors: Array<{ index: number; code: string; message: string }>;
  providers: unknown[];
  policyDeniedLocations: number;
  policyDeniedReads: number;
  policyDeniedReadSamples: string[];
  requestTruncated: boolean;
  freshness: 'not_requested' | 'changed_during_query' | 'current_at_query';
  sourceIdentity?: Record<string, unknown>;
  staticClosure: { scope: string; status: 'not_requested' | 'incomplete' | 'complete_for_requested_symbols'; limitations: string[] };
}

async function rhContextSemanticNavigation(
  repoRoot: string,
  policy: MultiRepositoryMcpToolContext['policy'],
  value: unknown,
  repositoryIdentity: { repoId: string; checkoutId: string },
): Promise<RhContextSemanticNavigationProjection> {
  const raw = Array.isArray(value) ? value : [];
  const requests = raw.slice(0, RH_CONTEXT_SEMANTIC_QUERY_LIMIT);
  const results: Record<string, unknown>[] = [];
  const errors: Array<{ index: number; code: string; message: string }> = [];
  let anyLocationTruncated = false;
  let policyDeniedLocations = 0;
  let policyDeniedReads = 0;
  const policyDeniedReadSamples = new Set<string>();
  const semanticAccessScope = createHash('sha256')
    .update(JSON.stringify({ profile: policy.profile, readGlobs: policy.readGlobs, denyGlobs: policy.denyGlobs }))
    .digest('hex')
    .slice(0, 20);

  const fingerprintOf = (identity: ReturnType<typeof freshGitIdentity> | undefined): string | undefined => identity
    ? identity.workingTreeFingerprint
      ?? createHash('sha256').update(`${identity.head ?? ''}\n${identity.branch ?? ''}`).digest('hex').slice(0, 24)
    : undefined;
  // Semantic providers are targeted/optional, so pay the stronger fresh identity
  // sampling cost only when semantic evidence was explicitly requested.
  const sourceBefore = requests.length > 0 ? freshGitIdentity(repoRoot) : undefined;
  const sourceFingerprintBefore = fingerprintOf(sourceBefore);
  const indexedRequests: Array<{ index: number; request: SemanticNavigationRequest }> = [];

  requests.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push({ index, code: 'SEMANTIC_NAVIGATION_REQUEST_INVALID', message: 'semantic_navigation entries must be objects.' });
      return;
    }
    const item = entry as Record<string, unknown>;
    const navigation = String(item.navigation ?? '') as SemanticNavigationKind;
    const path = String(item.path ?? '').trim();
    const line = Number(item.line);
    const column = Number(item.column);
    const tsconfigPath = typeof item.tsconfig_path === 'string' && item.tsconfig_path.trim() ? item.tsconfig_path.trim() : undefined;
    const language = typeof item.language === 'string' && item.language.trim() ? item.language.trim().toLowerCase() : undefined;
    if (!['definition', 'references', 'implementations'].includes(navigation) || !path || !Number.isInteger(line) || line < 1 || !Number.isInteger(column) || column < 1) {
      errors.push({ index, code: 'SEMANTIC_NAVIGATION_REQUEST_INVALID', message: 'navigation, path, and positive 1-based line/column are required.' });
      return;
    }
    const targetDecision = resolveMcpPath(repoRoot, path, policy, 'read');
    if (!targetDecision.ok) {
      errors.push({ index, code: 'SEMANTIC_NAVIGATION_TARGET_DENIED', message: targetDecision.reason ?? 'target path denied by MCP read policy.' });
      return;
    }
    indexedRequests.push({
      index,
      request: { navigation, path, line, column, ...(tsconfigPath ? { tsconfigPath } : {}), ...(language ? { language } : {}) },
    });
  });

  const allowRepositoryPath = (relativePath: string): boolean => {
    const decision = resolveMcpPath(repoRoot, relativePath, policy, 'read');
    if (decision.ok) return true;
    policyDeniedReads += 1;
    if (policyDeniedReadSamples.size < 20) policyDeniedReadSamples.add(relativePath);
    return false;
  };

  const navigationOutcomes = await defaultSemanticProviderRegistry.navigate(repoRoot, indexedRequests, {
    cacheScope: `mcp:${semanticAccessScope}`,
    sourceIdentity: sourceFingerprintBefore,
    profile: policy.profile,
    allowRepositoryPath,
  });

  for (const { index, outcome } of navigationOutcomes) {
    if (!outcome.ok) {
      errors.push({ index, code: outcome.code, message: outcome.message });
      continue;
    }
    const semantic = outcome.result;
    const allowedLocations = semantic.locations.filter((location) => {
      const decision = resolveMcpPath(repoRoot, location.path, policy, 'read');
      if (decision.ok) return true;
      policyDeniedLocations += 1;
      return false;
    });
    const truncated = allowedLocations.length > RH_CONTEXT_SEMANTIC_LOCATION_LIMIT;
    anyLocationTruncated ||= truncated;
    results.push({
      provider: semantic.providerId,
      ...(semantic.providerIdentity ? { providerIdentity: semantic.providerIdentity } : {}),
      language: semantic.language,
      navigation: semantic.navigation,
      target: semantic.target,
      locations: allowedLocations.slice(0, RH_CONTEXT_SEMANTIC_LOCATION_LIMIT),
      totalLocations: allowedLocations.length,
      returnedLocations: Math.min(allowedLocations.length, RH_CONTEXT_SEMANTIC_LOCATION_LIMIT),
      truncated,
      policyDeniedReads: semantic.policyDeniedReads ?? 0,
      ...(semantic.details ?? {}),
    });
  }

  results.sort((left, right) => {
    const leftTarget = left.target as { path?: string; line?: number; column?: number } | undefined;
    const rightTarget = right.target as { path?: string; line?: number; column?: number } | undefined;
    return String(leftTarget?.path ?? '').localeCompare(String(rightTarget?.path ?? ''))
      || Number(leftTarget?.line ?? 0) - Number(rightTarget?.line ?? 0)
      || Number(leftTarget?.column ?? 0) - Number(rightTarget?.column ?? 0);
  });

  const sourceAfter = requests.length > 0 ? freshGitIdentity(repoRoot) : undefined;
  const sourceFingerprintAfter = fingerprintOf(sourceAfter);
  const sourceChangedDuringQuery = Boolean(
    sourceBefore
    && sourceAfter
    && (sourceBefore.head !== sourceAfter.head || sourceFingerprintBefore !== sourceFingerprintAfter),
  );
  if (sourceChangedDuringQuery) {
    errors.push({
      index: -1,
      code: 'SEMANTIC_SOURCE_CHANGED_DURING_QUERY',
      message: 'Repository source identity changed while semantic providers were running. Returned locations are retained only as hints for the sampled source and are not proof for the newer source state.',
    });
  }

  const requestTruncated = raw.length > RH_CONTEXT_SEMANTIC_QUERY_LIMIT;
  const incomplete = requestTruncated || anyLocationTruncated || policyDeniedLocations > 0 || policyDeniedReads > 0 || errors.length > 0 || sourceChangedDuringQuery;
  const languages = new Set(results.map((entry) => String(entry.language ?? '')).filter(Boolean));
  const singleLanguage = languages.size === 1 ? [...languages][0] : undefined;
  const scope = singleLanguage === 'typescript'
    ? 'requested_typescript_static_relationships'
    : singleLanguage === 'swift'
      ? 'requested_swift_static_relationships'
      : singleLanguage
        ? `requested_${singleLanguage.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase()}_static_relationships`
        : languages.size > 1
          ? 'requested_multilanguage_static_relationships'
          : 'requested_semantic_static_relationships';
  return {
    requested: raw.length,
    executed: requests.length,
    results,
    errors,
    providers: defaultSemanticProviderRegistry.list(),
    policyDeniedLocations,
    policyDeniedReads,
    policyDeniedReadSamples: Array.from(policyDeniedReadSamples),
    requestTruncated,
    freshness: raw.length === 0 ? 'not_requested' : sourceChangedDuringQuery ? 'changed_during_query' : 'current_at_query',
    ...(sourceBefore ? {
      sourceIdentity: {
        repoId: repositoryIdentity.repoId,
        checkoutId: repositoryIdentity.checkoutId,
        branch: sourceBefore.branch,
        head: sourceBefore.head,
        workingTreeFingerprint: sourceFingerprintBefore,
        sampledAt: new Date(sourceBefore.sampledAt).toISOString(),
      },
    } : {}),
    staticClosure: {
      scope,
      status: raw.length === 0 ? 'not_requested' : incomplete ? 'incomplete' : 'complete_for_requested_symbols',
      limitations: ['dynamic_registration', 'string_or_config_edges', 'reflection', 'runtime_dispatch', 'stale_or_missing_language_index'],
    },
  };
}

export function summarizeControllerReadyPayload(fullPayload: Record<string, unknown>): Record<string, unknown> {
  const health = (fullPayload.health ?? {}) as Record<string, unknown>;
  const workerLoop = (fullPayload.workerLoop ?? {}) as Record<string, unknown>;
  const durableScheduler = (fullPayload.durableScheduler ?? {}) as Record<string, unknown>;
  const localBridge = (fullPayload.localBridge ?? {}) as Record<string, unknown>;
  const localBridgeHealth = (localBridge.health ?? {}) as Record<string, unknown>;
  const toolSurface = (fullPayload.toolSurface ?? {}) as Record<string, unknown>;
  const routeBehavior = (fullPayload.routeBehavior ?? {}) as Record<string, unknown>;
  const expectedTools = Array.isArray(toolSurface.expectedTools) ? toolSurface.expectedTools : [];
  const actualTools = Array.isArray(toolSurface.actualTools) ? toolSurface.actualTools : [];
  const repoIdValue = typeof fullPayload.repoId === 'string' ? fullPayload.repoId : undefined;
  return {
    detailLevel: 'summary',
    repoId: repoIdValue,
    ready: fullPayload.ready,
    state: fullPayload.state,
    reasons: fullPayload.reasons,
    taskLedgerStatus: fullPayload.taskLedgerStatus,
    taskLedgerCounts: fullPayload.taskLedgerCounts,
    gateway: fullPayload.gateway,
    projectionReconciliation: fullPayload.projectionReconciliation,
    health: {
      state: health.state,
      ready: health.ready,
      activeBlockers: health.activeBlockers,
      warnings: health.warnings,
      components: health.components,
    },
    activity: {
      queueDepth: workerLoop.queueDepth,
      runningWorkers: workerLoop.runningWorkers,
      activeLeases: workerLoop.activeLeases,
      schedulerStatus: durableScheduler.status,
      schedulerHeartbeatAgeMs: durableScheduler.heartbeatAgeMs,
      localBridgeReady: localBridgeHealth.ready ?? localBridge.running,
    },
    externalEndpoint: fullPayload.externalEndpoint,
    runtimeIdentity: (() => {
      const identity = fullPayload.runtimeIdentity && typeof fullPayload.runtimeIdentity === 'object'
        ? fullPayload.runtimeIdentity as Record<string, unknown>
        : undefined;
      if (!identity) return undefined;
      return {
        releaseId: identity.releaseId,
        runtimeCommit: identity.runtimeCommit,
        buildCommit: identity.buildCommit,
        startedAt: identity.startedAt,
        controllerInstanceId: identity.controllerInstanceId,
        endpoint: identity.endpoint,
        ready: identity.ready,
        reasonCodes: identity.reasonCodes,
        toolset: identity.toolset,
        profile: identity.profile,
      };
    })(),
    routeBehavior: {
      schemaVersion: routeBehavior.schemaVersion,
      fingerprint: routeBehavior.fingerprint,
      probeCount: routeBehavior.probeCount,
    },
    toolSurface: {
      ready: toolSurface.ready,
      // Never report 0/0 as a real tool surface: an uncomputed exposure is
      // explicitly unknown until the snapshot has been built.
      expectedToolCount: expectedTools.length > 0 || toolSurface.ready ? expectedTools.length : null,
      actualToolCount: actualTools.length > 0 || toolSurface.ready ? actualTools.length : null,
      toolSurfaceState: expectedTools.length === 0 && actualTools.length === 0 && !toolSurface.ready ? 'unknown' : 'computed',
      missingTools: toolSurface.missingTools,
      unexpectedTools: toolSurface.unexpectedTools,
      duplicateTools: toolSurface.duplicateTools,
      fingerprint: toolSurface.fingerprint,
      schemaStableAcrossAccessModes: toolSurface.schemaStableAcrossAccessModes,
    },
    access: fullPayload.access,
    registeredRepositories: fullPayload.registeredRepositories,
    detailPointer: {
      tool: 'controller_ready',
      arguments: { ...(repoIdValue ? { repo_id: repoIdValue } : {}), detail_level: 'detail' },
    },
  };
}

function withRuntimeResponseMeta(
  payload: Record<string, unknown>,
  startedAt: number,
  options: {
    phaseTimingsMs?: Record<string, number>;
    transport?: string;
    sessionId?: string;
    routing?: { repoId?: string; checkoutId?: string };
    cacheHit?: boolean;
    stale?: boolean;
    refreshJobId?: string;
    sourceObservation?: { observedAt: string; ageMs: number; maxAgeMs: number; policy: 'bounded_sample_with_mutation_invalidation' };
  } = {},
): Record<string, unknown> {
  const response = {
    ...payload,
    responseMeta: {
      serverDurationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      phaseTimingsMs: options.phaseTimingsMs ?? {},
      transport: options.transport ?? 'runtime-local',
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      ...(options.routing ? { routing: options.routing } : {}),
      ...(options.cacheHit !== undefined ? { cacheHit: options.cacheHit } : {}),
      ...(options.stale !== undefined ? { stale: options.stale } : {}),
      ...(options.refreshJobId ? { refreshJobId: options.refreshJobId } : {}),
      ...(options.sourceObservation ? { sourceObservation: options.sourceObservation } : {}),
      structuredPayloadBytes: 0,
    },
  };
  response.responseMeta.structuredPayloadBytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
  return response;
}









function summarizeJobEvents(controllerHome: string, repoId: string, jobId: string): Array<Record<string, unknown>> {
  const repoRoot = repositoryRootForRepoId(controllerHome, repoId);
  return readJobEvents(controllerHome, repoId, jobId).slice(-20).map((event) => {
    const dataPreview = event.data && Object.keys(event.data).length > 0 ? jsonPreview(event.data, 240, repoRoot ? [repoRoot] : []) : undefined;
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      revision: event.revision,
      ...(dataPreview ? { dataPreview: dataPreview.preview, dataTruncated: dataPreview.truncated } : {}),
    };
  });
}

function summarizeExecutionJob(job: ExecutionJob, repoRoot?: string): Record<string, unknown> {
  return summarizeExecutionJobForMcp(job, repoRoot);
}

function summarizeRuntimeProjectionForReadiness<T extends { currentAttention?: unknown; attention?: unknown }>(projection: T): T & { historicalAttention?: unknown } {
  return {
    ...projection,
    attention: projection.currentAttention ?? projection.attention,
    historicalAttention: projection.attention,
  };
}

/**
 * Read-only Runtime identity projection. A stored identity is accepted only
 * while the live Runtime owner has the same Runtime instance and PID.
 */


function controllerContextAssessment(args: Record<string, unknown>) {
  const description = typeof args.description === 'string' && args.description.trim()
    ? args.description
    : 'Inspect the selected repository context.';
  return assessWorkMode({
    description,
    knownPaths: stringList(args.known_paths),
    expectedFiles: typeof args.expected_files === 'number' ? args.expected_files : undefined,
    expectedChangedLines: typeof args.expected_changed_lines === 'number' ? args.expected_changed_lines : undefined,
    requiresInvestigation: args.requires_investigation === true,
    requiresParallelism: args.requires_parallelism === true,
    requiresLongRunningChecks: args.requires_long_running_checks === true,
    needsDependencies: args.needs_dependencies === true,
    requiresIndependentDeliverables: args.requires_independent_deliverables === true,
    independentTaskCount: typeof args.independent_task_count === 'number' ? args.independent_task_count : undefined,
    requiresRemoteWrite: args.requires_remote_write === true || args.remote_write === true,
    requiresRecovery: args.requires_recovery === true,
    agentRequested: args.agent_requested === true || args.requires_worker === true,
    requiresWorkerIsolation: args.requires_worker_isolation === true,
    risk: typeof args.risk === 'string' ? args.risk as TaskRisk : undefined,
    explicitMode: parseExplicitTaskMode(args.mode) ?? (typeof args.description === 'string' && args.description.trim() ? undefined : 'direct'),
  });
}





function compactContextTask(value: unknown): Record<string, unknown> {
  const task = contextRecord(value);
  return {
    issueId: task.issueId ?? task.id,
    taskId: task.taskId ?? task.id,
    title: task.title,
    effectiveStatus: task.effectiveStatus,
    verificationStatus: task.verificationStatus,
    latestRunStatus: task.latestRunStatus,
    retryable: task.retryable,
    dispatchable: task.dispatchable,
    queueable: task.queueable,
  };
}

function compactContextEvent(value: unknown): Record<string, unknown> | string {
  if (typeof value === 'string') return contextText(value, 300) ?? '';
  const event = contextRecord(value);
  return {
    eventId: event.eventId ?? event.id,
    type: event.type ?? event.eventType,
    status: event.status,
    issueId: event.issueId,
    taskId: event.taskId,
    summary: contextText(event.summary ?? event.message, 300),
    occurredAt: event.occurredAt ?? event.createdAt ?? event.at,
  };
}

function compactContextAction(value: unknown): Record<string, unknown> | string {
  if (typeof value === 'string') return contextText(value, 300) ?? '';
  const action = contextRecord(value);
  return {
    actionId: action.actionId ?? action.id,
    title: action.title,
    reason: contextText(action.reason ?? action.summary, 300),
  };
}

function compactControllerContextSummaryPayload(payload: Record<string, unknown>): Record<string, unknown> {
  // Idempotent: already-compacted summaries pass through untouched.
  if (payload.detailLevel === 'summary') return payload;
  const git = contextRecord(payload.git);
  const repository = contextRecord(payload.repository);
  const ledger = contextRecord(payload.taskLedger);
  const operationalPlan = contextRecord(payload.operationalPlan);
  const ready = contextRecord(payload.controllerReady);
  const runtimeProjection = contextRecord(payload.runtimeProjection);
  const runtimeProjectionState = contextRecord(payload.runtimeProjectionState);
  const currentIssue = contextRecord(payload.currentIssue);
  const currentIssueTasks = Array.isArray(currentIssue.tasks) ? currentIssue.tasks : [];
  const plugins = Array.isArray(payload.plugins) ? payload.plugins : [];
  const checks = Array.isArray(payload.checks) ? payload.checks : [];
  const activeRuns = Array.isArray(payload.activeRuns) ? payload.activeRuns : [];
  const attention = Array.isArray(ledger.attention) ? ledger.attention : [];
  const readyTasks = Array.isArray(ledger.readyTasks) ? ledger.readyTasks : [];
  const recommendedExecution = contextRecord(payload.recommendedExecution);
  const runtimeIdentity = contextRecord(payload.runtimeIdentity);
  const runtime = contextRecord(payload.runtime);
  const repoId = String(payload.repoId ?? repository.repoId ?? '');
  const enabledCount = plugins.filter((plugin) => contextRecord(plugin).enabled === true).length;
  const unhealthyCount = plugins.filter((plugin) => {
    const health = contextRecord(contextRecord(plugin).health);
    return health.state === 'unhealthy' || health.ready === false;
  }).length;
  const attentionPluginIds = plugins
    .filter((plugin) => {
      const health = contextRecord(contextRecord(plugin).health);
      return ['degraded', 'unhealthy', 'error'].includes(String(health.state));
    })
    .map((plugin) => contextRecord(plugin).pluginId)
    .filter((id): id is string => typeof id === 'string')
    .slice(0, 5);
  const recommendedCheckIds = checks
    .filter((check) => contextRecord(check).recommended === true || contextRecord(check).required === true)
    .map((check) => contextRecord(check).id)
    .filter((id): id is string => typeof id === 'string')
    .slice(0, 8);
  const lastFailureCount = checks.filter((check) => {
    const value = contextRecord(check);
    return value.lastFailureAt || value.failed === true;
  }).length;
  const changedFileCount = typeof git.changedFileCount === 'number'
    ? git.changedFileCount
    : typeof git.diffStat === 'string'
      ? git.diffStat.split(/\r?\n/).filter((line) => line.includes('|')).length
      : git.dirty === true ? -1 : 0;
  const compact: Record<string, unknown> = {
    detailLevel: 'summary',
    // Deprecated compatibility: legacy clients read this before focus.currentIssue.
    ...(payload.currentIssueId !== undefined ? { currentIssueId: payload.currentIssueId } : {}),
    repoId,
    repository: {
      repoId,
      checkoutId: repository.activeCheckoutId ?? repository.checkoutId,
      root: repository.canonicalRoot ?? repository.root ?? repository.localRoot,
      branch: git.branch,
      head: git.head,
      dirty: git.dirty === true,
      changedFileCount,
    },
    focus: {
      ...(currentIssue.id ? {
        currentIssue: {
          id: currentIssue.id,
          title: currentIssue.title,
          status: currentIssue.status,
          lifecycleStatus: currentIssue.lifecycleStatus,
          updatedAt: currentIssue.updatedAt,
          taskCount: currentIssueTasks.length,
          tasks: currentIssueTasks.slice(0, 5).map(compactContextTask),
        },
      } : {}),
      ...(payload.currentTask && typeof payload.currentTask === 'object' ? { currentTask: payload.currentTask } : {}),
      activeRunCount: activeRuns.length,
      ...(typeof payload.activeJobCount === 'number' ? { activeJobCount: payload.activeJobCount } : {}),
    },
    health: {
      ready: ready.ready === true,
      reasonCodes: Array.isArray(ready.reasonCodes) ? ready.reasonCodes.slice(0, 10) : [],
      diagnostics: contextRecord(ready.diagnostics),
      observedAt: ready.observedAt,
    },
    attention: attention.slice(0, 5).map(compactContextTask),
    readyTasks: readyTasks.slice(0, 5).map(compactContextTask),
    execution: {
      recommendedMode: recommendedExecution.mode ?? recommendedExecution.recommendedMode ?? null,
      executionPath: recommendedExecution.executionPath ?? recommendedExecution.path ?? null,
      requiredChecks: recommendedCheckIds,
    },
    runtime: {
      releaseId: runtime.releaseId ?? runtimeIdentity.releaseId,
      runtimeCommit: runtime.runtimeCommit ?? runtimeIdentity.runtimeCommit,
      controllerInstanceId: runtime.controllerInstanceId ?? runtimeIdentity.controllerInstanceId,
      toolset: runtime.toolset ?? runtimeIdentity.toolset,
    },
    detailPointers: {
      git: { tool: 'repository_git_status', arguments: { repo_id: repoId } },
      taskLedger: { tool: 'controller_context', arguments: { repo_id: repoId, detail_level: 'detail' } },
      plugin: { tool: 'list_plugins', arguments: { repo_id: repoId } },
      check: { tool: 'controller_context', arguments: { repo_id: repoId, detail_level: 'detail' } },
      history: { tool: 'controller_context', arguments: { repo_id: repoId, detail_level: 'detail' } },
    },
    git: {
      branch: git.branch,
      head: git.head,
      dirty: git.dirty === true,
      changedFileCount,
    },
    plugins: { enabledCount, disabledCount: Math.max(0, plugins.length - enabledCount), unhealthyCount, attentionPluginIds },
    checks: { availableCount: checks.length, recommendedCheckIds, lastFailureCount },
    taskLedger: {
      schemaVersion: ledger.schemaVersion,
      source: ledger.source,
      generatedAt: ledger.generatedAt,
      currentIssueId: ledger.currentIssueId,
      counts: ledger.counts,
      issueCount: ledger.issueCount,
      archivedIssueCount: ledger.archivedIssueCount,
      status: ledger.status,
      contextContract: {
        strategy: contextRecord(ledger.contextContract).strategy,
        rawCodeRequiredForImplementation: true,
      },
    },
    operationalPlan: {
      schemaVersion: operationalPlan.schemaVersion,
      source: operationalPlan.source,
      generatedAt: operationalPlan.generatedAt,
      status: operationalPlan.status,
      completedCapabilities: (Array.isArray(operationalPlan.completedCapabilities) ? operationalPlan.completedCapabilities : []).slice(0, 5),
      remainingDecisionPoints: (Array.isArray(operationalPlan.remainingDecisionPoints) ? operationalPlan.remainingDecisionPoints : []).slice(0, 5),
      validationStrategy: operationalPlan.validationStrategy,
    },
    // Required keys for cache-completeness and legacy readers (deprecated).
    runtimeStorage: payload.runtimeStorage,
    runtimeProjectionState,
    runtimeProjection: runtimeProjection.repoId || runtimeProjection.revision !== undefined
      ? {
        schemaVersion: runtimeProjection.schemaVersion,
        repoId: runtimeProjection.repoId,
        generatedAt: runtimeProjection.generatedAt,
        revision: runtimeProjection.revision,
        queueDepth: runtimeProjection.queueDepth,
        runningWorkers: runtimeProjection.runningWorkers,
        activeLeases: runtimeProjection.activeLeases,
        currentAttention: (Array.isArray(runtimeProjection.currentAttention) ? runtimeProjection.currentAttention : []).slice(0, 5),
      }
      : runtimeProjection,
    activeRuns: activeRuns.slice(0, 5).map((run) => {
      const value = contextRecord(run);
      return { runId: value.runId, issueId: value.issueId, taskId: value.taskId, status: value.status, agent: value.agent, provider: value.provider, progress: value.progress, lastHeartbeatAt: value.lastHeartbeatAt, error: contextText(value.error, 300) };
    }),
    localBridge: (() => {
      const localBridge = contextRecord(payload.localBridge);
      return { reconciliation: localBridge.reconciliation };
    })(),
    recommendedExecution: recommendedExecution,
    ...(payload.repository ? { repositorySummary: repository } : {}),
  };
  if (ready.health || ready.ready !== undefined) {
    compact.controllerReady = summarizeControllerReadyPayload(ready);
  }
  return compact;
}



























function structuralIndexRoot(repository: ReturnType<typeof resolveRepositorySelection>): string | undefined {
  if (existsSync(join(repository.canonicalRoot, '.codegraph', 'codegraph.db'))) return repository.canonicalRoot;
  return repository.checkouts
    .filter((checkout) => checkout.checkoutId !== repository.activeCheckoutId && checkout.worktree !== true)
    .map((checkout) => checkout.canonicalRoot)
    .find((root) => existsSync(join(root, '.codegraph', 'codegraph.db')));
}

async function legacyIosPluginAction(
  ctx: MultiRepositoryMcpToolContext,
  legacyTool: string,
  args: Record<string, unknown>,
): Promise<CallToolResult | undefined> {
  const repository = selected(ctx, args);
  const invocation = legacyIosPluginInvocation(legacyTool, args);
  if (!invocation) return undefined;
  return callRuntimeTool(ctx, 'plugin_action_execute', {
    repo_id: repository.repoId,
    checkout_id: repository.activeCheckoutId,
    plugin_id: 'ios',
    action_id: invocation.actionId,
    request_id: invocation.requestId,
    arguments: invocation.arguments,
    ...(invocation.confirmAuthorization ? { confirm_authorization: true } : {}),
  });
}

/**
 * Projection freshness is event-driven (source identity, invalidation marker,
 * materialized-view revision). The wall-clock TTL is only a bounded fallback
 * for lost events, so it is intentionally coarse.
 */
const CONTROLLER_CONTEXT_PROJECTION_REFRESH_MS = Math.max(
  5_000,
  Number(process.env.FORGE_CONTEXT_PROJECTION_REFRESH_MS ?? 300_000),
);

export async function controllerReadiness(
  ctx: MultiRepositoryMcpToolContext,
  repository = ctx.explicitRepository,
  signals: ControllerReadinessSignals = {},
) {
  const evidence = await controllerReadinessEvidence(ctx, repository, signals);
  const reasonCodes = new Set(evidence.reasons.map((item) => item.code));
  const controllerServicesReady = evidence.daemon.status === 'ready' && evidence.daemon.degraded !== true;
  const schedulerReady = evidence.durableScheduler.status === 'ready';
  const workersReady = evidence.workerLoop.consuming;
  const databaseReady = evidence.health.components.projection.ready;
  const releaseCoherenceReady = evidence.daemon.status === 'ready' && evidence.daemon.degraded !== true;
  const runtimeSource = runtimeSourceSnapshotStatus(evidence.daemon.source, ctx.runtimeSourceRoot);
  const sourceCoherenceReady = !runtimeSource.restartRequired;
  if (!sourceCoherenceReady) reasonCodes.add(runtimeSource.code);
  const ready = evidence.ready
    && controllerServicesReady
    && schedulerReady
    && workersReady
    && databaseReady
    && releaseCoherenceReady
    && sourceCoherenceReady;

  return {
    ready,
    reasonCodes: [...reasonCodes],
    diagnostics: {
      database: {
        ready: databaseReady,
        evidence: {
          persisted: evidence.projectionSnapshot?.persisted,
          stale: evidence.projectionSnapshot?.stale,
          projectionRevision: evidence.projection?.revision,
        },
      },
      controllerServices: {
        ready: controllerServicesReady,
        evidence: {
          status: evidence.daemon.status,
          degraded: evidence.daemon.degraded,
          error: evidence.daemon.error,
        },
      },
      scheduler: {
        ready: schedulerReady,
        evidence: {
          loopStartedAt: evidence.durableScheduler.loopStartedAt,
          lastTickAt: evidence.durableScheduler.lastTickAt,
          lastDispatchAt: evidence.durableScheduler.lastDispatchAt,
          heartbeatAgeMs: evidence.durableScheduler.heartbeatAgeMs,
          dispatchHeartbeatAgeMs: evidence.durableScheduler.dispatchHeartbeatAgeMs,
        },
      },
      workers: {
        ready: workersReady,
        evidence: {
          queueDepth: evidence.workerLoop.queueDepth,
          runningWorkers: evidence.workerLoop.runningWorkers,
          activeLeases: evidence.workerLoop.activeLeases,
          consuming: evidence.workerLoop.consuming,
        },
      },
      releaseCoherence: {
        ready: releaseCoherenceReady && sourceCoherenceReady,
        evidence: {
          status: evidence.daemon.status,
          degraded: evidence.daemon.degraded,
          error: evidence.daemon.error,
          sourceCoherence: {
            ready: sourceCoherenceReady,
            code: runtimeSource.code,
            reasons: runtimeSource.reasons,
          },
        },
      },
      mcpEndToEnd: {
        ready: evidence.ready,
        evidence: {
          activeBlockers: evidence.reasons,
          warnings: evidence.warnings,
        },
      },
    },
    observedAt: new Date().toISOString(),
  };
}

function workPhase(status: ExecutionJob['status']): 'queued' | 'running' | 'attention' | 'completed' {
  if (['succeeded', 'failed', 'cancelled', 'timed_out'].includes(status)) return 'completed';
  if (['orphaned', 'stale', 'human_attention_required'].includes(status)) return 'attention';
  if (status === 'running' || status === 'dispatched') return 'running';
  return 'queued';
}

function summarizeWork(job: ExecutionJob, repoRoot?: string): Record<string, unknown> {
  const summary = summarizeExecutionJob(job, repoRoot);
  return {
    workId: job.jobId,
    requestId: job.requestId,
    repoId: job.repoId,
    operation: typeof job.payload?.operation === 'string' ? job.payload.operation : job.type,
    phase: workPhase(job.status),
    resumable: true,
    ...summary,
  };
}

const TERMINAL_WORK_HANDLE_STATES = new Set<WorkHandleState['state']>(['cleaned', 'failed']);

function workHandlePhase(handle: WorkHandleState): 'implementation' | 'verification' | 'delivery' | 'cleanup' | 'completed' | 'attention' {
  if (handle.state === 'cleaned') return 'completed';
  if (handle.state === 'failed') return 'attention';
  if (handle.state === 'validating') return 'verification';
  if (handle.state === 'committed') return 'delivery';
  if (handle.state === 'merged') return 'cleanup';
  return 'implementation';
}

function reconcileReadableWorkHandle(
  controllerHome: string,
  repoId: string,
  workId: string,
): WorkHandleState | undefined {
  const handle = readWorkHandle(controllerHome, repoId, workId);
  if (!handle) return undefined;
  try {
    return reconcileWorkValidation(controllerHome, handle).handle;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('CONTROL_PLANE_REVISION_CONFLICT')) throw error;
    return readWorkHandle(controllerHome, repoId, workId);
  }
}

async function waitForReadableWorkHandle(
  controllerHome: string,
  repoId: string,
  workId: string,
  waitMs: number,
): Promise<{ handle?: WorkHandleState; timedOut: boolean; waitedMs: number }> {
  const startedAt = Date.now();
  let handle = reconcileReadableWorkHandle(controllerHome, repoId, workId);
  while (handle && !TERMINAL_WORK_HANDLE_STATES.has(handle.state) && Date.now() - startedAt < waitMs) {
    const remaining = waitMs - (Date.now() - startedAt);
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.min(100, remaining))));
    handle = reconcileReadableWorkHandle(controllerHome, repoId, workId);
  }
  const waitedMs = Date.now() - startedAt;
  return {
    handle,
    timedOut: Boolean(handle && !TERMINAL_WORK_HANDLE_STATES.has(handle.state)),
    waitedMs,
  };
}

function summarizeWorkHandle(
  handle: WorkHandleState,
  contract?: NonNullable<ReturnType<typeof getWorkContract>>,
): Record<string, unknown> {
  const terminal = TERMINAL_WORK_HANDLE_STATES.has(handle.state);
  const summary = contract?.objective?.trim()
    ? contract.objective.slice(0, 240)
    : `Work ${handle.workId} is ${handle.state}.`;
  return {
    kind: 'work_handle',
    workId: handle.workId,
    repoId: handle.repositoryId,
    checkoutId: handle.checkoutId,
    state: handle.state,
    phase: workHandlePhase(handle),
    statusLabel: handle.state,
    summary,
    terminal,
    resumable: !terminal,
    branch: handle.branch,
    expectedHead: handle.expectedHead,
    validation: handle.finalization.validation,
    updatedAt: handle.updatedAt,
    nextAction: terminal
      ? undefined
      : handle.state === 'validating'
        ? 'Wait for persisted validation receipts.'
        : 'Continue the existing WorkHandle.',
  };
}

function summarizeSubmittedWorkContract(contract: NonNullable<ReturnType<typeof getWorkContract>>): Record<string, unknown> {
  const operation = contract.submittedOperation;
  const continuation = buildWorkContinuationSnapshot(contract);
  return {
    kind: 'work_contract',
    workId: contract.workId,
    repoId: contract.repoId,
    status: contract.status,
    operation: operation?.name,
    requestId: contract.requestId,
    deduplicated: undefined,
    nextAction: continuation.nextSafeAction,
    mode: contract.mode,
    objective: contract.objective,
    updatedAt: contract.updatedAt,
    resourceClaims: operation?.resourceClaims ?? [],
    operationMetadata: operation
      ? {
          mode: operation.mode,
          idempotent: operation.idempotent,
          replayable: operation.replayable,
          resourceClaims: operation.resourceClaims,
        }
      : undefined,
    summary: contract.objective.slice(0, 240),
    phase: contract.status === 'running'
      ? 'running'
      : contract.status === 'failed' || contract.status === 'cancelled'
        ? 'attention'
        : contract.status === 'completed'
          ? 'completed'
          : 'queued',
    statusLabel: contract.status,
    semantics: continuation.semantics,
    reconciliationRequired: continuation.reconciliationRequired,
  };
}

function summarizeWorkContractListItem(contract: NonNullable<ReturnType<typeof getWorkContract>>): Record<string, unknown> {
  const terminal = ['succeeded', 'failed', 'cancelled'].includes(contract.status);
  return {
    workId: contract.workId,
    kind: 'work_contract',
    mode: contract.mode,
    objective: contract.objective,
    status: contract.status,
    phase: terminal ? 'completed' : contract.status === 'running' ? 'running' : 'attention',
    statusLabel: terminal ? '已完成' : contract.status === 'running' ? '运行中' : '待审查',
    summary: `WorkContract ${contract.status}: ${contract.objective.slice(0, 240)}`,
    terminal,
    resumable: !terminal,
    changedFileCount: 0,
    evidenceCount: contract.evidenceRefs.length,
    checkCount: contract.checkRefs.length,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    suggestedNextAction: contract.suggestedNextActions[0],
    semantics: buildWorkContinuationSnapshot(contract).semantics,
    reconciliationRequired: buildWorkContinuationSnapshot(contract).reconciliationRequired,
    detailPointer: { tool: 'work_get', work_id: contract.workId },
  };
}

function resolveWorkJob(
  ctx: MultiRepositoryMcpToolContext,
  repoId: string,
  args: Record<string, unknown>,
): ExecutionJob | undefined {
  const workId = typeof args.work_id === 'string' ? args.work_id.trim() : '';
  const requestId = typeof args.request_id === 'string' ? args.request_id.trim() : '';
  if (!workId && !requestId) throw new Error('WORK_ID_REQUIRED: provide work_id or request_id');
  if (workId) {
    try { return getExecutionJob(ctx.controllerHome, repoId, workId); }
    catch { return undefined; }
  }
  return getExecutionJobByRequestId(ctx.controllerHome, requestId, repoId);
}

function managedProcessOperationDigest(
  handle: NonNullable<ReturnType<typeof getProcessHandle>>,
): Record<string, unknown> {
  const terminal = handle.completed === true;
  const phase = terminal
    ? handle.ok === true
      ? 'succeeded'
      : handle.timedOut === true
        ? 'timed_out'
        : handle.cancelled === true
          ? 'cancelled'
          : 'failed'
    : 'running';
  return {
    schemaVersion: 1,
    operationId: handle.processId,
    operationType: 'managed-process',
    workRef: handle.processId,
    status: handle.status,
    phase,
    terminal,
    resumable: !terminal,
    completed: handle.completed === true,
    ok: handle.ok,
    exitCode: handle.exitCode,
    timedOut: handle.timedOut,
    cancelled: handle.cancelled,
    startedAt: handle.startedAt,
    summary: terminal
      ? `Managed process ${handle.processId} completed with status ${handle.status}.`
      : `Managed process ${handle.processId} is still ${handle.status}.`,
    // A running Process is not itself a request to poll. The controller should
    // keep making independent progress, then join only at its real dependency
    // boundary through the Process lifecycle surface.
    suggestedNextActions: [],
  };
}













export async function callRuntimeTool(ctx: MultiRepositoryMcpToolContext, name: string, args: Record<string, unknown>): Promise<CallToolResult | undefined> {
  try {
    const statusInbox = await callStatusInboxAdapter(ctx, name, args, {
      repair: (adapterCtx, repository, adapterArgs) => runFacadeRepair(adapterCtx, repository, adapterArgs),
      inboxApplication: (input) => runHandoffInboxApplication(input, {
        triggerResolvedContinuation: (item) => triggerWorkContinuationRepositoryEvent(
          input.store.controllerHome,
          input.store.repoId,
          handoffResolvedContinuationEventName(item.id),
          `handoff:${item.id}:${item.updatedAt}`,
          { workId: item.workId, data: { handoffId: item.id, status: item.status, decision: item.decision } },
        ),
      }),
    });
    if (statusInbox) return statusInbox;
    const context = await callContextAdapter(ctx, name, args);
    if (context) return context;
    const plugin = await callPluginAdapter(ctx, name, args);
    if (plugin) return plugin;
    const recovery = await callRecoveryAdapter(ctx, name, args);
    if (recovery) return recovery;
    const artifact = callArtifactAdapter(ctx, name, args);
    if (artifact) return artifact;
    const filesystem = callFilesystemAdapter(ctx, name, args);
    if (filesystem) return filesystem;
    const model = callModelAdapter(ctx, name, args);
    if (model) return model;
    switch (name) {
      case 'rh_work': return await callWorkAdapter(ctx, args);
      case 'work_get': {
        const repository = selected(ctx, args);
        const workId = typeof args.work_id === 'string' ? args.work_id.trim() : '';
        const requestId = typeof args.request_id === 'string' ? args.request_id.trim() : '';
        const contract = workId
          ? getWorkContract({ controllerHome: ctx.controllerHome, repoId: repository.repoId }, workId)
          : requestId
            ? getWorkContractByRequestId(ctx.controllerHome, requestId, repository.repoId)
            : undefined;
        const handleId = workId || contract?.workId || '';
        if (handleId) {
          const waited = args.wait === true || typeof args.wait_ms === 'number';
          const waitMs = typeof args.wait_ms === 'number' ? Math.max(0, args.wait_ms) : 15_000;
          const resolved = waited
            ? await waitForReadableWorkHandle(ctx.controllerHome, repository.repoId, handleId, waitMs)
            : { handle: reconcileReadableWorkHandle(ctx.controllerHome, repository.repoId, handleId), timedOut: false, waitedMs: 0 };
          if (resolved.handle) {
            const work = summarizeWorkHandle(resolved.handle, contract);
            return result({
              work,
              workHandle: resolved.handle,
              ...(contract ? {
                workContract: contract,
                continuation: buildWorkContinuationSnapshot(contract),
              } : {}),
              summary: work.summary,
              phase: work.phase,
              statusLabel: work.statusLabel,
              waited,
              timedOut: resolved.timedOut,
              waitedMs: resolved.waitedMs,
              next: work.nextAction,
            }, resolved.handle.state === 'failed');
          }
        }
        let job = resolveWorkJob(ctx, repository.repoId, args);
        if (!job) {
          if (contract) {
            const work = summarizeSubmittedWorkContract(contract);
            const waited = args.wait === true || typeof args.wait_ms === 'number';
            const terminal = contract.status === 'completed' || contract.status === 'failed' || contract.status === 'cancelled';
            return result({
              work,
              workContract: contract,
              continuation: buildWorkContinuationSnapshot(contract),
              summary: work.summary,
              phase: work.phase,
              statusLabel: work.statusLabel,
              waited,
              timedOut: waited ? !terminal : false,
              waitedMs: waited && typeof args.wait_ms === 'number' ? args.wait_ms : 0,
              next: work.nextAction,
            });
          }
          return result({ error: { code: 'WORK_NOT_FOUND', message: 'No Work matched this repository and identifier.', errorClass: 'not_found', summary: '未找到对应任务。' } }, true);
        }
        let timedOut = false;
        let waitedMs = 0;
        if (args.wait === true) {
          const waited = await waitForExecutionJob({
            controllerHome: ctx.controllerHome,
            repoId: repository.repoId,
            jobId: job.jobId,
            timeoutMs: typeof args.wait_ms === 'number' ? args.wait_ms : 15_000,
          });
          job = waited.job;
          timedOut = waited.timedOut;
          waitedMs = waited.waitedMs;
        }
        const digest = buildJobOperationDigest(job, { waited: args.wait === true, stillRunning: timedOut });
        return result({
          work: summarizeWork(job, repository.canonicalRoot),
          digest,
          summary: digest.summary,
          phase: digest.phase,
          statusLabel: digest.statusLabel,
          errorClass: digest.errorClass,
          errorMessage: digest.errorMessage,
          waited: args.wait === true || typeof args.wait_ms === 'number',
          timedOut,
          waitedMs,
          ...(args.include_events === true ? { events: summarizeJobEvents(ctx.controllerHome, job.repoId, job.jobId) } : {}),
        }, digest.phase === 'failed' || digest.phase === 'timed_out');
      }
      case 'work_wait': {
        const repository = selected(ctx, args);
        const waitMs = typeof args.wait_ms === 'number' ? Math.max(0, args.wait_ms) : 15_000;
        const workId = typeof args.work_id === 'string' ? args.work_id.trim() : '';
        const requestId = typeof args.request_id === 'string' ? args.request_id.trim() : '';
        const contract = workId
          ? getWorkContract({ controllerHome: ctx.controllerHome, repoId: repository.repoId }, workId)
          : requestId
            ? getWorkContractByRequestId(ctx.controllerHome, requestId, repository.repoId)
            : undefined;
        const handleId = workId || contract?.workId || '';
        if (handleId) {
          const resolved = await waitForReadableWorkHandle(ctx.controllerHome, repository.repoId, handleId, waitMs);
          if (resolved.handle) {
            const work = summarizeWorkHandle(resolved.handle, contract);
            return result({
              work,
              workHandle: resolved.handle,
              ...(contract ? {
                workContract: contract,
                continuation: buildWorkContinuationSnapshot(contract),
              } : {}),
              summary: work.summary,
              phase: work.phase,
              statusLabel: work.statusLabel,
              waited: true,
              timedOut: resolved.timedOut,
              waitedMs: resolved.waitedMs,
              next: work.nextAction,
            }, resolved.handle.state === 'failed');
          }
        }
        const job = resolveWorkJob(ctx, repository.repoId, args);
        if (!job) {
          const processRef = String(args.work_id ?? args.request_id ?? '').trim();
          const process = getRepositoryCommandProcess(ctx.controllerHome, repository.repoId, processRef);
          if (!process) return result({ error: { code: 'WORK_NOT_FOUND', message: 'No Work or managed process matched this repository and identifier.', errorClass: 'not_found', summary: '未找到对应任务。' } }, true);
          const waitedProcess = await waitRepositoryCommandProcess(ctx.controllerHome, repository.repoId, processRef, { timeoutMs: waitMs });
          const digest = managedProcessOperationDigest(waitedProcess);
          return result({
            work: { kind: 'managed_process', processId: processRef },
            digest,
            summary: digest.summary,
            phase: digest.phase,
            suggestedNextActions: digest.suggestedNextActions,
            waited: true,
            timedOut: waitedProcess.completed !== true,
            waitedMs: waitMs,
          }, digest.phase === 'failed' || digest.phase === 'timed_out');
        }
        const waited = await waitForExecutionJob({
          controllerHome: ctx.controllerHome,
          repoId: repository.repoId,
          jobId: job.jobId,
          timeoutMs: waitMs,
        });
        const digest = buildJobOperationDigest(waited.job, { waited: true, stillRunning: waited.timedOut });
        return result({
          work: summarizeWork(waited.job, repository.canonicalRoot),
          digest,
          summary: digest.summary,
          phase: digest.phase,
          statusLabel: digest.statusLabel,
          errorClass: digest.errorClass,
          errorMessage: digest.errorMessage,
          changedFiles: digest.changedFiles,
          suggestedNextActions: digest.suggestedNextActions,
          waited: true,
          timedOut: waited.timedOut,
          waitedMs: waited.waitedMs,
        }, digest.phase === 'failed' || digest.phase === 'timed_out');
      }
      case 'work_list': {
        const repository = selected(ctx, args);
        const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(Math.trunc(args.limit), 100)) : 50;
        const jobs = listExecutionJobs(ctx.controllerHome, repository.repoId, limit).map(summarizeWorkListItem);
        const contracts = listWorkContracts({
          controllerHome: ctx.controllerHome,
          repoId: repository.repoId,
          status: 'all',
          limit,
        }).map(summarizeWorkContractListItem);
        const works = [...jobs, ...contracts]
          .sort((left, right) => String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? '')))
          .slice(0, limit);
        return result({ detailLevel: 'summary', works, next: 'Call work_get for bounded details.' });
      }
      case 'work_cancel': {
        const repository = selected(ctx, args);
        const job = resolveWorkJob(ctx, repository.repoId, args);
        if (!job) return result({ error: { code: 'WORK_NOT_FOUND', message: 'No Work matched this repository and identifier.', errorClass: 'not_found', summary: '未找到对应任务。' } }, true);
        const cancelled = await cancelExecutionJob(
          ctx.controllerHome,
          repository.repoId,
          job.jobId,
          typeof args.reason === 'string' ? args.reason : undefined,
        );
        const digest = buildJobOperationDigest(cancelled);
        return result({ work: summarizeWork(cancelled, repository.canonicalRoot), digest, summary: digest.summary, phase: digest.phase });
      }
      case 'git_diff_paths': {
        const repository = selected(ctx, args);
        return result({
          ...selectedPathDiff(repository, {
            paths: args.paths,
            staged: args.staged === true,
            maxBytes: typeof args.max_bytes === 'number' ? args.max_bytes : undefined,
          }),
        });
      }
      case 'git_stage_paths': {
        const repository = selected(ctx, args);
        const staged = stageSelectedPaths(ctx.controllerHome, repository, { paths: args.paths });
        return result({
          repoId: repository.repoId,
          checkoutId: repository.activeCheckoutId,
          ...staged,
        }, staged.execution.ok !== true);
      }
      case 'git_commit_paths': {
        const repository = selected(ctx, args);
        let reviewedCommitPlan: ReviewedDirectEditWorkCommitPlan | undefined;
        let committed;
        try {
          committed = commitSelectedPaths(ctx.controllerHome, repository, {
            paths: args.paths,
            message: args.message,
            beforeCommitGuard: ({ stagedPaths, currentHead }) => {
              reviewedCommitPlan = prepareReviewedDirectEditWorkCommit({
                controllerHome: ctx.controllerHome,
                repository,
                stagedPaths,
                currentHead,
              });
            },
          });
        } catch (error) {
          return result({
            repoId: repository.repoId,
            checkoutId: repository.activeCheckoutId,
            error: {
              code: 'SELECTED_PATH_PRECOMMIT_GUARD_FAILED',
              message: error instanceof Error ? error.message : String(error),
            },
          }, true);
        }
        const directEditWorkCompletion = !committed.error && committed.commit?.ok === true && reviewedCommitPlan
          ? completeReviewedDirectEditWorkAfterCommit({
              controllerHome: ctx.controllerHome,
              repository,
              plan: reviewedCommitPlan,
              fallbackBranch: repository.defaultBranch || 'main',
            })
          : undefined;
        return result({
          repoId: repository.repoId,
          checkoutId: repository.activeCheckoutId,
          ...committed,
          ...(directEditWorkCompletion ? { directEditWorkCompletion } : {}),
        }, Boolean(committed.error));
      }
      case 'schedule_dedupe_report': {
        const repository = selected(ctx, args);
        return result({ report: buildScheduleDedupeReport(ctx.controllerHome, repository.repoId) });
      }
      case 'schedule_dedupe_apply': {
        const repository = selected(ctx, args);
        return result({ dedupe: applyScheduleDedupe(ctx.controllerHome, repository.repoId, { dryRun: args.dry_run, confirmAuthorization: args.confirm_authorization }) });
      }
      case 'local_bridge_status': {
        const repository = selected(ctx, args);
        const detailLevel = args.detail_level === 'detail' || args.detail === true ? 'detail' : 'summary';
        const surface = resolveLocalBridgeSurface({
          controllerHome: ctx.controllerHome,
          repoRoot: repository.canonicalRoot,
          // Process scan is expensive; only for detail or missing runtime state.
          allowProcessScan: detailLevel === 'detail',
        });
        const endpoint = surface.endpoint;
        const shouldProbe = surface.enabled
          && surface.endpointConfigured
          && Boolean(endpoint)
          && surface.mode !== 'disabled';
        const liveHealth = shouldProbe ? await probeLocalControllerHealth(endpoint) : null;
        const endpointReachable = liveHealth !== null;
        const expectedSurface = shouldProbe
          ? localControllerDiagnosticMatchesRuntime(liveHealth, {
            generation: surface.generation,
          })
          : false;
        const processAlive = surface.processRunning;
        const projectionSnapshot = readRepositoryProjectionSnapshot(ctx.controllerHome, repository.repoId);
        const daemon = readForgeRuntimeStatus(ctx.controllerHome);
        const scheduler = readSchedulerHealthSnapshot(ctx.controllerHome);
        const schedulerHeartbeatAgeMs = ageMs(scheduler.lastTickAt);
        const schedulerDispatchHeartbeatAgeMs = ageMs(scheduler.lastDispatchAt);
        const runtimeStorage = ensureRepositoryRuntimeStorage(repository, ctx.controllerHome);
        const health = evaluateRuntimeHealth({
          daemon: {
            status: daemon.status,
            error: daemon.error,
            heartbeatAgeMs: schedulerHeartbeatAgeMs,
          },
          scheduler: {
            status: daemon.degraded ? 'degraded' : daemon.status,
            heartbeatAgeMs: schedulerHeartbeatAgeMs,
            dispatchHeartbeatAgeMs: schedulerDispatchHeartbeatAgeMs,
          },
          workers: {
            queueDepth: projectionSnapshot.projection.queueDepth,
            runningWorkers: projectionSnapshot.projection.runningWorkers,
            activeLeases: projectionSnapshot.projection.activeLeases,
            activeAttentionCount: projectionSnapshot.projection.currentAttention.length,
          },
          projection: projectionObservation(projectionSnapshot),
          localBridge: {
            enabled: surface.enabled,
            requiredForReadiness: surface.requiredForReadiness,
            mode: surface.mode,
            endpoint,
            // When endpoint is not configured (disabled/unknown), treat as non-issue.
            endpointReachable: shouldProbe ? endpointReachable : true,
            expectedSurface: shouldProbe ? expectedSurface : true,
            processAlive,
            runtimeStateFresh: surface.source === 'service-runtime' || surface.source === 'repo-runtime',
            error: surface.error,
          },
          runtimeStorage: {
            readable: true,
            ready: runtimeStorage.readyForExecution,
            warnings: runtimeStorage.warnings,
          },
        });
        const jobs = listLocalBridgeJobSnapshots(repository.canonicalRoot, detailLevel === 'detail' ? 12 : 20);
        const { activeJobCount, recentJobSummary } = summarizeRecentJobs(jobs);
        const running = surface.enabled
          && health.components.localBridge.ready
          && (!shouldProbe || (endpointReachable && expectedSurface));
        // Historical job counts are operational stats, not current readiness blockers.
        const bridgeWarnings = health.components.localBridge.warnings
          .filter((warning) => warning.code !== 'LOCAL_BRIDGE_ENDPOINT_UNAVAILABLE'
            || surface.requiredForReadiness
            || shouldProbe)
          .map((warning) => ({ code: warning.code, message: warning.message }));

        if (detailLevel === 'summary') {
          return result({
            localBridgeSummary: true,
            omitEnvelope: true,
            detailLevel: 'summary',
            repoId: repository.repoId,
            running,
            ready: health.components.localBridge.ready,
            mode: surface.mode,
            endpoint: endpoint ?? null,
            endpointConfigured: surface.endpointConfigured,
            endpointReachable: shouldProbe ? endpointReachable : null,
            processRunning: processAlive ?? null,
            expectedSurface: surface.expectedSurface,
            requiredForReadiness: surface.requiredForReadiness,
            warnings: bridgeWarnings,
            activeJobCount,
            recentJobSummary,
            statusSource: surface.source,
            nonBlocking: !surface.requiredForReadiness,
          });
        }

        return result({
          detailLevel: 'detail',
          endpoint: endpoint ?? null,
          endpointConfigured: surface.endpointConfigured,
          running,
          capability: {
            enabled: surface.enabled,
            requiredForReadiness: surface.requiredForReadiness,
            mode: surface.mode,
            ready: health.components.localBridge.ready,
            endpointReachable: shouldProbe ? endpointReachable : null,
            expectedSurface: shouldProbe ? expectedSurface : null,
            observedAt: new Date().toISOString(),
            owner: {
              kind: surface.ownerKind,
              ...(surface.pid ? { pid: surface.pid } : {}),
            },
            evidence: {
              endpointReachable: shouldProbe ? endpointReachable : null,
              expectedSurface: shouldProbe ? expectedSurface : null,
              ...(processAlive !== undefined ? { processAlive } : {}),
              runtimeStateFresh: surface.source === 'service-runtime' || surface.source === 'repo-runtime',
              observedAt: new Date().toISOString(),
            },
          },
          health: {
            ready: health.ready,
            // Do not elevate historical job failures into active blockers.
            activeBlockers: health.activeBlockers,
            warnings: health.warnings,
          },
          error: surface.error,
          statusSource: surface.source,
          counts: recentJobSummary,
          activeJobCount,
          recentJobSummary,
          approvalQueue: false,
          reconciliation: { scanned: jobs.length, active: activeJobCount, terminalized: 0, deferredToController: true },
          recentJobs: jobs.map((job) => ({
            jobId: job.jobId,
            action: job.action,
            status: job.status,
            checkId: job.action === 'run-check' ? (job.payload as { checkId?: string }).checkId : undefined,
            runId: job.runId,
            issueId: job.issueId,
            taskId: job.taskId,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            finishedAt: job.finishedAt,
            revision: job.revision,
            deadlineAt: job.deadlineAt,
            error: job.error?.slice(0, 300),
          })),
          fallback: 'Open the localhost Local Controller to launch work or inspect execution when a ChatGPT write action is unavailable.',
          repoId: repository.repoId,
          repository: repositorySummary(repository),
          runtimeStorage,
          nonBlocking: !surface.requiredForReadiness,
        });
      }
      case 'get_local_job': {
        const repository = selected(ctx, args);
        const jobId = String(args.job_id ?? '').trim();
        const job = getLocalBridgeJobSnapshot(repository.canonicalRoot, jobId);
        return result({
          job: job.job,
          lookup: job.status === 'ok' ? undefined : job,
          ...(args.include_events === true && job.status === 'ok'
            ? { events: getLocalBridgeJobEventsSnapshot(repository.canonicalRoot, jobId) }
            : {}),
          ...(args.include_output === true ? { output: readLocalBridgeJobOutputSnapshot(repository.canonicalRoot, jobId, {
            stream: args.stream === 'stderr' ? 'stderr' : 'stdout',
            maxBytes: typeof args.max_bytes === 'number' ? args.max_bytes : undefined,
          }) } : {}),
          repoId: repository.repoId,
          repository: repositorySummary(repository),
          runtimeStorage: ensureRepositoryRuntimeStorage(repository, ctx.controllerHome),
          nonBlocking: true,
        });
      }
      case 'get_local_job_output': {
        const repository = selected(ctx, args);
        const jobId = String(args.job_id ?? '').trim();
        return result({
          ...readLocalBridgeJobOutputSnapshot(repository.canonicalRoot, jobId, {
            stream: args.stream === 'stderr' ? 'stderr' : 'stdout',
            maxBytes: typeof args.max_bytes === 'number' ? args.max_bytes : undefined,
          }),
          repoId: repository.repoId,
          repository: repositorySummary(repository),
          runtimeStorage: ensureRepositoryRuntimeStorage(repository, ctx.controllerHome),
          nonBlocking: true,
        });
      }
      case 'controller_context': {
        const responseStartedAt = performance.now();
        const phaseTimingsMs: Record<string, number> = {};
        const markPhase = (name: string, startedAt: number): void => {
          phaseTimingsMs[name] = Math.round((performance.now() - startedAt) * 100) / 100;
        };
        const repositoryStartedAt = performance.now();
        const repository = selected(ctx, args);
        const recommendedExecution = controllerContextAssessment(args);
        const modeContextPack = recommendedExecution.modeBehavior.structuralContext === 'required'
          ? buildControllerContextPack(repository.canonicalRoot, ctx.policy, {
              description: typeof args.description === 'string' ? args.description : undefined,
              knownPaths: stringList(args.known_paths),
              structuralContext: 'required',
              maxFiles: 8,
              maxSnippets: 20,
              session: ctx.sessionId?.trim()
                ? { sessionId: ctx.sessionId.trim(), repoId: repository.repoId, checkoutId: repository.activeCheckoutId }
                : undefined,
            })
          : undefined;
        markPhase('repositoryRouting', repositoryStartedAt);
        const variant = args.detail_level === 'detail' ? 'detail' as const : 'summary' as const;
        const runtimeRoot = repositoryControllerRoot(ctx.controllerHome, repository.repoId);
        const runtimeStorage = {
          repoId: repository.repoId,
          controllerRoot: runtimeRoot,
          readyForExecution: existsSync(runtimeRoot),
          readOnly: true,
        };
        const runtimeSnapshot = readRepositoryProjectionSnapshot(ctx.controllerHome, repository.repoId);
        const runtimeProjection = runtimeSnapshot.projection;
        const contextSourceRevision = String(runtimeProjection.metadata?.contentRevision ?? runtimeProjection.revision);
        // Git identity is sampled at most once per TTL per repository; hot reads
        // reuse the sampled HEAD/fingerprint instead of spawning subprocesses.
        const gitIdentityStartedAt = performance.now();
        const gitIdentity = cachedGitIdentity(repository.canonicalRoot);
        const gitIdentityObservation = {
          observedAt: new Date(gitIdentity.sampledAt).toISOString(),
          ageMs: Math.max(0, Date.now() - gitIdentity.sampledAt),
          maxAgeMs: GIT_IDENTITY_SAMPLE_TTL_MS,
          policy: 'bounded_sample_with_mutation_invalidation' as const,
        };
        markPhase('gitIdentity', gitIdentityStartedAt);
        const invalidationStartedAt = performance.now();
        const contextInvalidation = readControllerContextProjectionInvalidation(repository.canonicalRoot);
        markPhase('invalidation', invalidationStartedAt);
        const sourceIdentity = {
          repoId: repository.repoId,
          checkoutId: repository.activeCheckoutId,
          canonicalRoot: repository.canonicalRoot,
          head: gitIdentity.head,
          branch: gitIdentity.branch,
          workingTreeFingerprint: gitIdentity.workingTreeFingerprint,
          runtimeGeneration: runtimeProjection.metadata?.producerGeneration,
          sourceRevision: contextSourceRevision,
          variant,
          toolset: ctx.toolset,
          profile: ctx.policy.profile,
        };
        markPhase('identity', repositoryStartedAt);
        const cacheStartedAt = performance.now();
        const cached = readControllerContextProjection(ctx.controllerHome, repository.repoId, {
          sourceIdentity,
        });
        const projectionAgeMs = controllerContextProjectionAgeMs(cached);
        markPhase('cacheRead', cacheStartedAt);
        const cachedPayload = cached?.payload;
        const cachedProjectionIncomplete = !cachedPayload
          || typeof cachedPayload !== 'object'
          || !('repoId' in cachedPayload)
          || !('runtimeProjectionState' in cachedPayload)
          || !('controllerReady' in cachedPayload);
        const invalidatedAfterBuild = Boolean(
          cached
          && contextInvalidation
          && cached.invalidationNonce !== contextInvalidation.nonce,
        );
        // The materialized-view stale flag is reported, not acted on: a view
        // that is stale-but-unchanged (daemon down) would otherwise force an
        // endless rebuild of an already-current context projection. Context
        // freshness tracks its own source identity, the view revision, and the
        // invalidation marker.
        const cacheStale = controllerContextProjectionNeedsRefresh(cached, contextSourceRevision, sourceIdentity)
          || invalidatedAfterBuild
          || !Number.isFinite(projectionAgeMs)
          || projectionAgeMs >= CONTROLLER_CONTEXT_PROJECTION_REFRESH_MS;
        const projectionPayload = (
          projectionRecord: typeof cached,
          stale: boolean,
          refreshJobId?: string,
        ): Record<string, unknown> => {
          const ageMs = controllerContextProjectionAgeMs(projectionRecord);
          return {
            contextProjection: {
              variant,
              generatedAt: projectionRecord?.generatedAt,
              ageMs: Number.isFinite(ageMs) ? ageMs : undefined,
              stale,
              healthImpact: false,
              sourceIdentity: projectionRecord?.sourceIdentity ?? sourceIdentity,
              projectionGeneration: projectionRecord?.projectionGeneration ?? controllerContextProjectionGeneration(sourceIdentity),
              refreshState: projectionRecord?.refreshState ?? 'idle',
              lastRefreshError: projectionRecord?.lastRefreshError,
              nextAttemptAt: projectionRecord?.nextAttemptAt,
              sourceRevision: projectionRecord?.sourceRevision ?? contextSourceRevision,
              strategy: 'event-driven-swr',
              refreshJobId,
              readOnly: true,
              nonBlocking: true,
            },
          };
        };

        const responseOptions = {
          phaseTimingsMs,
          transport: 'runtime-local',
          sessionId: ctx.sessionId,
          routing: { repoId: repository.repoId, checkoutId: repository.activeCheckoutId },
          sourceObservation: gitIdentityObservation,
        };
        const respondWith = (
          payload: Record<string, unknown>,
          projectionRecord: typeof cached,
          input: { cacheHit: boolean; stale: boolean; refreshJobId?: string },
        ): CallToolResult => {
          const { modeContextPack: _cachedModeContextPack, ...basePayload } = payload;
          const taskScopedPayload = {
            ...basePayload,
            ...(basePayload.detailLevel === 'summary' ? {
              execution: {
                ...contextRecord(basePayload.execution),
                recommendedMode: recommendedExecution.recommendedMode,
                executionPath: recommendedExecution.executionPath,
              },
            } : {}),
            recommendedExecution,
            ...(modeContextPack ? { modeContextPack } : {}),
          };
          if (!controllerContextProjectionPayloadMatchesSourceIdentity(taskScopedPayload, sourceIdentity)) {
            const response = withRuntimeResponseMeta({
              error: {
                code: 'CONTEXT_PROJECTION_SOURCE_MISMATCH',
                message: 'Refusing controller context whose payload identity differs from the selected repository checkout.',
                errorClass: 'infrastructure_failure',
                summary: 'Controller context identity validation failed closed.',
              },
              ...projectionPayload(projectionRecord, true, input.refreshJobId),
            }, responseStartedAt, { ...responseOptions, cacheHit: input.cacheHit, stale: true, refreshJobId: input.refreshJobId });
            const responseBytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
            recordControllerContextRead({
              durationMs: performance.now() - responseStartedAt,
              cacheHit: input.cacheHit,
              stale: true,
              responseBytes,
              phaseDurationsMs: phaseTimingsMs,
            });
            return result(response, true);
          }
          const response = withRuntimeResponseMeta({
            ...taskScopedPayload,
            ...projectionPayload(projectionRecord, input.stale, input.refreshJobId),
          }, responseStartedAt, { ...responseOptions, cacheHit: input.cacheHit, stale: input.stale, refreshJobId: input.refreshJobId });
          const responseBytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
          recordControllerContextRead({
            durationMs: performance.now() - responseStartedAt,
            cacheHit: input.cacheHit,
            stale: input.stale,
            responseBytes,
            phaseDurationsMs: phaseTimingsMs,
          });
          return result(response);
        };
        if (variant === 'summary' && cached && !cachedProjectionIncomplete && !cacheStale) {
          return respondWith(compactControllerContextSummaryPayload(cached.payload), cached, { cacheHit: true, stale: false });
        }

        const buildStartedAt = performance.now();
        const buildPayload = async (): Promise<Record<string, unknown>> => {
          const readinessStartedAt = performance.now();
          const readiness = await controllerReadiness(ctx, repository);
          markPhase('build.readiness', readinessStartedAt);
          const activeCheckout = repository.checkouts.find((checkout) => checkout.checkoutId === repository.activeCheckoutId);
          const gitStartedAt = performance.now();
          const liveGit = gitSnapshot(repository.canonicalRoot);
          markPhase('build.git', gitStartedAt);
          const taskStateStartedAt = performance.now();
          const board = legacyIssueAuthorityRetired(repository.canonicalRoot)
            ? undefined
            : projectBoard(repository.canonicalRoot);
          const taskLedger = buildControllerTaskLedgerProjection(repository.canonicalRoot, board);
          const operationalPlan = buildControllerOperationalPlan(repository.canonicalRoot, taskLedger);
          markPhase('build.task_state', taskStateStartedAt);
          const currentIssueRecord = board?.currentIssueId
            ? board.issues.find((issue) => issue.id === board.currentIssueId)
            : undefined;
          const currentIssue = currentIssueRecord ? {
            id: currentIssueRecord.id,
            title: currentIssueRecord.title,
            status: currentIssueRecord.status,
            lifecycleStatus: currentIssueRecord.lifecycleStatus,
            updatedAt: currentIssueRecord.updatedAt,
            tasks: Array.isArray(currentIssueRecord.tasks)
              ? currentIssueRecord.tasks.slice(0, 20).map((task) => {
                const item = task as Record<string, unknown>;
                return {
                  id: item.id,
                  title: item.title,
                  effectiveStatus: item.effectiveStatus,
                  latestRunStatus: item.latestRunStatus,
                };
              })
              : [],
          } : undefined;
          const jobsStartedAt = performance.now();
          const activeRuns = listActiveAgentJobSnapshots(repository.canonicalRoot, 20).map((run) => ({
            runId: run.runId,
            issueId: run.issueId,
            taskId: run.taskId,
            status: run.status,
            agent: run.agent,
            provider: run.provider,
            executionMode: run.executionMode,
            progress: run.progress,
            lastHeartbeatAt: run.lastHeartbeatAt,
            error: run.error,
          }));
          const localJobs = listLocalBridgeJobSnapshots(repository.canonicalRoot, 12);
          const activeLocalJobs = localJobs.filter((job) => ['approved', 'running', 'dispatched'].includes(job.status)).length;
          const recentLocalJobs = localJobs.map((job) => ({
            jobId: job.jobId,
            action: job.action,
            status: job.status,
            runId: job.runId,
            issueId: job.issueId,
            taskId: job.taskId,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            finishedAt: job.finishedAt,
            error: job.error?.slice(0, 300),
          }));
          markPhase('build.jobs', jobsStartedAt);
          const checksStartedAt = performance.now();
          const checks = listControllerChecks(repository.canonicalRoot).map((check) => {
            const evidence = readLatestControllerCheckEvidence(repository.canonicalRoot, check.id);
            return {
              id: check.id,
              description: check.description,
              timeoutMs: check.timeoutMs,
              source: check.source,
              ...(evidence ? { lastFailureAt: evidence.ok ? undefined : evidence.executedAt, failed: !evidence.ok } : {}),
            };
          });
          markPhase('build.checks', checksStartedAt);
          const pluginsStartedAt = performance.now();
          const plugins = listAssistantPluginManifests(ctx.controllerHome, repository, {
            preferStored: true,
            // Controller context is a materialized read in every detail mode.
            // Missing projections remain unknown until explicit plugin discovery
            // or execution refreshes them; a context read never probes hosts.
            fallbackToLive: false,
          }).map((plugin) => ({
            pluginId: plugin.pluginId,
            provider: plugin.provider,
            enabled: plugin.enabled,
            revision: plugin.revision,
            lifecycle: plugin.lifecycle,
            health: plugin.health,
            actionCount: plugin.actions.length,
            actions: plugin.actions.map((action) => ({
              actionId: action.actionId,
              readOnly: action.readOnly,
              risk: action.risk,
              confirmation: action.confirmation,
            })),
          }));
          markPhase('build.plugins', pluginsStartedAt);
          return {
            git: liveGit.branch || liveGit.head || liveGit.status || liveGit.diffStat ? liveGit : {
              branch: activeCheckout?.branch ?? sourceIdentity.branch ?? null,
              head: sourceIdentity.head ?? null,
              status: 'No live repository scan is available; showing bounded runtime state only.',
              diffStat: '',
              dirty: false,
            },
            currentIssueId: board?.currentIssueId ?? taskLedger.currentIssueId,
            currentIssue,
            taskLedger,
            taskLedgerStatus: taskLedger.status,
            operationalPlan,
            readyTasks: (board?.readyTasks ?? taskLedger.readyTasks).slice(0, 20),
            activeRuns,
            activeJobCount: activeLocalJobs,
            localBridge: {
              reconciliation: { scanned: localJobs.length, active: activeLocalJobs, terminalized: 0 },
              recentJobs: recentLocalJobs,
            },
            plugins,
            checks,
            repoId: repository.repoId,
            repository: repositorySummary(repository),
            runtimeStorage,
            recommendedExecution,
            ...(modeContextPack ? { modeContextPack } : {}),
            runtimeProjection,
            runtimeProjectionState: {
              stale: runtimeSnapshot.stale,
              persisted: runtimeSnapshot.persisted,
            },
            controllerReady: readiness,
            runtimeIdentity: runtimeIdentitySnapshot(ctx),
          };
        };

        if (variant === 'summary' && cached && !cachedProjectionIncomplete) {
          const refresh = queueControllerContextProjectionRefresh(ctx.controllerHome, repository.repoId, {
            variant,
            sourceIdentity,
            projectionGeneration: controllerContextProjectionGeneration(sourceIdentity),
            invalidationNonce: contextInvalidation?.nonce,
            build: buildPayload,
          });
          markPhase('refreshQueue', buildStartedAt);
          const refreshing = readControllerContextProjection(ctx.controllerHome, repository.repoId, {
            sourceIdentity,
          });
          return respondWith(compactControllerContextSummaryPayload(cached.payload), refreshing ?? cached, {
            cacheHit: true,
            stale: true,
            refreshJobId: refresh.refreshJobId,
          });
        }

        const payload = await buildPayload();
        const persistedPayload = variant === 'summary'
          ? compactControllerContextSummaryPayload(payload)
          : payload;
        markPhase('build', buildStartedAt);
        let projectionRecord: typeof cached;
        try {
          projectionRecord = writeControllerContextProjection(ctx.controllerHome, repository.repoId, persistedPayload, {
            sourceRevision: contextSourceRevision,
            contentFingerprint: runtimeProjection.metadata?.contentFingerprint,
            invalidationNonce: contextInvalidation?.nonce,
            sourceIdentity,
            variant,
            projectionGeneration: controllerContextProjectionGeneration(sourceIdentity),
            refreshState: 'idle',
          });
        } catch {
          projectionRecord = cached;
        }
        markPhase('serialize', performance.now());
        return respondWith(persistedPayload, projectionRecord, {
          cacheHit: false,
          stale: controllerContextProjectionNeedsRefresh(projectionRecord, contextSourceRevision, sourceIdentity),
        });
      }

      case 'get_job': {
        const jobId = String(args.job_id ?? '').trim();
        let job = typeof args.repo_id === 'string' ? getExecutionJob(ctx.controllerHome, args.repo_id, jobId) : findExecutionJob(ctx.controllerHome, jobId);
        if (!job) return result({ error: { code: 'JOB_NOT_FOUND', message: jobId || 'missing job_id', errorClass: 'not_found', summary: '未找到对应 Job。' } }, true);
        let timedOut = false;
        let waitedMs = 0;
        if (args.wait === true || typeof args.wait_ms === 'number') {
          const waited = await waitForExecutionJob({
            controllerHome: ctx.controllerHome,
            repoId: job.repoId,
            jobId: job.jobId,
            timeoutMs: typeof args.wait_ms === 'number' ? args.wait_ms : 15_000,
          });
          job = waited.job;
          timedOut = waited.timedOut;
          waitedMs = waited.waitedMs;
        }
        const full = args.detail_level === 'full';
        const repoRoot = repositoryRootForRepoId(ctx.controllerHome, job.repoId);
        // summarizeExecutionJob already embeds a compact digest + single suggestedNextActions list.
        const jobSummary = summarizeExecutionJob(job, repoRoot);
        return result({
          detailLevel: 'summary',
          requestedDetailLevel: full ? 'full' : 'summary',
          job: jobSummary,
          summary: jobSummary.summary,
          phase: jobSummary.phase,
          statusLabel: jobSummary.statusLabel,
          errorClass: jobSummary.errorClass,
          errorMessage: jobSummary.errorMessage,
          changedFiles: jobSummary.changedFiles,
          suggestedNextActions: jobSummary.suggestedNextActions,
          artifactRefs: jobSummary.artifactRefs,
          evidenceIds: jobSummary.evidenceIds,
          evidenceRefs: jobSummary.evidenceRefs,
          waited: args.wait === true || typeof args.wait_ms === 'number',
          timedOut,
          waitedMs,
          ...(args.include_events === true
            ? { events: summarizeJobEvents(ctx.controllerHome, job.repoId, job.jobId) }
            : {}),
          next: full
            ? 'Raw job state is intentionally not returned through MCP. Use the bounded job summary, events, and get_artifact with artifactId (ART-...), not evidenceId (EVD-...).'
            : jobSummary.terminal
              ? String(jobSummary.summary ?? '')
              : 'Historical Job is still active. Continue independent work; read it only if an observation can change the next decision, and use work_wait only when this exact result becomes a dependency. Do not periodically poll.',
        }, jobSummary.phase === 'failed' || jobSummary.phase === 'timed_out');
      }
      case 'repository_change_verify': {
        const repository = selected(ctx, args);
        const expectedFileShas = args.expected_file_shas && typeof args.expected_file_shas === 'object' && !Array.isArray(args.expected_file_shas)
          ? Object.fromEntries(
            Object.entries(args.expected_file_shas as Record<string, unknown>)
              .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
          )
          : undefined;
        const payload = repositoryChangeVerify({
          repo: repository.canonicalRoot,
          expectedBranch: typeof args.expected_branch === 'string' ? args.expected_branch : undefined,
          expectedHead: typeof args.expected_head === 'string' ? args.expected_head : undefined,
          expectedFileShas,
          patch: typeof args.patch === 'string' ? args.patch : undefined,
          allowedPaths: Array.isArray(args.allowed_paths)
            ? args.allowed_paths.filter((value): value is string => typeof value === 'string')
            : undefined,
          checks: Array.isArray(args.checks)
            ? args.checks.filter((value): value is string => typeof value === 'string')
            : undefined,
          checkTimeoutMs: typeof args.check_timeout_ms === 'number' ? args.check_timeout_ms : undefined,
        });
        return result(payload as unknown as Record<string, unknown>, payload.status === 'failed');
      }
      case 'get_artifact': {
        const artifactId = String(args.artifact_id ?? '').trim();
        const artifactRepoId = String(args.repo_id ?? '').trim();
        if (artifactId.startsWith('EVD-')) {
          const evidence = readExecutionEvidence(ctx.controllerHome, artifactRepoId, artifactId);
          return result({
            referenceType: 'evidence',
            evidenceId: evidence.evidenceId,
            repoId: evidence.repoId,
            jobId: evidence.jobId,
            outcome: evidence.outcome,
            operation: evidence.operation,
            revision: evidence.revision,
            executedAt: evidence.executedAt,
            note: 'This is an evidenceId (EVD-...), not an artifactId (ART-...). Evidence holds audit metadata; command output lives under artifactRefs/artifactId.',
            next: `For output content, call get_job with job_id=${evidence.jobId} and use artifactRefs.artifactId, then get_artifact with that ART-... id.`,
          });
        }
        if (!artifactId.startsWith('ART-') && artifactId) {
          return result({
            error: {
              code: 'ARTIFACT_ID_EXPECTED',
              message: `Expected artifactId starting with ART- (got ${artifactId.slice(0, 40)}). evidenceId (EVD-...) is audit metadata; use get_job artifactRefs for content.`,
            },
            referenceType: 'unknown',
            next: 'Call get_job, read artifactRefs[].artifactId (ART-...), then get_artifact with that id and repo_id.',
          }, true);
        }
        const maxBytes = typeof args.max_bytes === 'number' ? args.max_bytes : 64 * 1024;
        const loaded = readExecutionArtifact(ctx.controllerHome, artifactRepoId, artifactId, maxBytes);
        // Do not re-attach controller/repository/runtime envelopes here; multi-repo layer already compact.
        return result({
          referenceType: 'artifact',
          artifactId: loaded.artifact.artifactId,
          artifactKind: loaded.artifact.kind,
          repoId: loaded.artifact.repoId,
          jobId: loaded.artifact.jobId,
          byteLength: loaded.artifact.byteLength,
          mediaType: loaded.artifact.mediaType,
          truncated: loaded.truncated,
          content: loaded.content,
          next: loaded.truncated
            ? `Artifact truncated at ${maxBytes} bytes. Re-call get_artifact with a larger max_bytes (up to 512KB) or page via result refs.`
            : 'Artifact content loaded.',
        });
      }
      case 'list_jobs': {
        const repository = selected(ctx, args);
        const requestedLimit = typeof args.limit === 'number' ? Math.trunc(args.limit) : 100;
        const limit = Math.max(1, Math.min(requestedLimit, 100));
        const jobs = listExecutionJobs(ctx.controllerHome, repository.repoId, limit);
        const full = args.detail_level === 'full';
        return result({
          detailLevel: 'summary',
          requestedDetailLevel: full ? 'full' : 'summary',
          limit,
          jobs: jobs.map((job) => summarizeExecutionJob(job, repository.canonicalRoot)),
          next: 'Call get_job with one job_id for bounded details; raw job state is intentionally not returned through MCP.',
        });
      }
      case 'cancel_job': {
        const jobId = String(args.job_id ?? '').trim();
        const job = typeof args.repo_id === 'string' ? getExecutionJob(ctx.controllerHome, args.repo_id, jobId) : findExecutionJob(ctx.controllerHome, jobId);
        if (!job) return result({ error: { code: 'JOB_NOT_FOUND', message: jobId } }, true);
        const cancelled = await cancelExecutionJob(ctx.controllerHome, job.repoId, job.jobId, typeof args.reason === 'string' ? args.reason : undefined);
        const repoRoot = repositoryRootForRepoId(ctx.controllerHome, cancelled.repoId);
        return result({ job: summarizeExecutionJob(cancelled, repoRoot) });
      }
      case 'controller_ready': {
        const explicitRepoId = typeof args.repo_id === 'string' && args.repo_id.trim() ? args.repo_id.trim() : undefined;
        const registered = listRepositories(ctx.controllerHome).filter((repository) => repository.enabled && !repository.removedAt);
        const repository = explicitRepoId
          ? selected(ctx, args)
          : (ctx.explicitRepository ?? (registered.length === 1 ? registered[0] : undefined));
        const readiness = await controllerReadiness(ctx, repository);
        const exposure = controllerExposureSnapshot(ctx);
        const toolSurfaceReady = exposure.ready && exposure.missingToolNames.length === 0;
        const reasonCodes = new Set(readiness.reasonCodes);
        if (!toolSurfaceReady) reasonCodes.add('MCP_TOOL_SURFACE_INCOMPLETE');
        const mcpReady = readiness.diagnostics.mcpEndToEnd.ready && toolSurfaceReady;
        const ready = readiness.ready && mcpReady;
        const payload = {
          ready,
          reasonCodes: [...reasonCodes],
          diagnostics: {
            ...readiness.diagnostics,
            mcpEndToEnd: {
              ready: mcpReady,
              evidence: {
                ...readiness.diagnostics.mcpEndToEnd.evidence,
                expectedToolCount: exposure.expectedToolNames.length,
                actualToolCount: exposure.actualToolNames.length,
                missingTools: exposure.missingToolNames,
                unexpectedTools: exposure.unexpectedToolNames,
                duplicateTools: exposure.duplicateToolNames,
                fingerprint: exposure.fingerprint,
              },
            },
          },
          observedAt: readiness.observedAt,
        };
        return result(payload);
      }
      case 'repository_runtime_snapshot': {
        const repository = selected(ctx, args);
        const snapshot = readRepositoryProjectionSnapshot(ctx.controllerHome, repository.repoId);
        return result({
          snapshot: summarizeRuntimeProjectionForReadiness(snapshot.projection),
          stale: snapshot.stale,
          persisted: snapshot.persisted,
          dirtySinceAt: snapshot.dirtySinceAt,
          dirtyReason: snapshot.dirtyReason,
        });
      }
      case 'runtime_performance_diagnostics': {
        const repository = selected(ctx, args);
        const projection = readRepositoryProjectionSnapshot(ctx.controllerHome, repository.repoId).projection;
        const runtime = loadMcpRuntimeState(repository.canonicalRoot);
        const inferredLocalBridge = inferLocalControllerProcess(repository.canonicalRoot);
        const activeJobIds = listExecutionJobs(ctx.controllerHome, repository.repoId, 100)
          .filter((job) => ['queued', 'dispatched', 'running', 'waiting_for_dependency', 'waiting_for_workspace', 'waiting_for_heavy_check', 'waiting_for_integration'].includes(job.status))
          .map((job) => job.jobId);
        const diagnostics = collectRuntimePerformanceDiagnostics({
          repoId: repository.repoId,
          repoRoot: repository.canonicalRoot,
          queueDepth: projection?.queueDepth ?? 0,
          runningWorkers: projection?.runningWorkers ?? 0,
          activeLeases: projection?.activeLeases ?? 0,
          activeJobIds,
          includeProcesses: args.include_processes !== false,
          includeTempDirs: args.include_temp_dirs !== false,
          cleanupPreview: args.cleanup_preview === true,
          localControllerRunning: runtime?.localController?.running === true || inferredLocalBridge?.running === true,
          localControllerPid: runtime?.localController?.pid ?? inferredLocalBridge?.pid,
          localControllerEndpoint: runtime?.localController?.endpoint ?? inferredLocalBridge?.endpoint,
        });
        return result({
          ...diagnostics,
          contextPerformance: controllerContextPerformanceSnapshot(),
          gitPerformance: gitSnapshotPerformanceSnapshot(),
          gitIdentity: gitIdentityPerformanceSnapshot(),
          runtimeIdentity: runtimeIdentitySnapshot(ctx),
          resourceCost: {
            processRuntime: processRuntimeResourceDiagnostics(),
            scheduler: readSchedulerHealthSnapshot(ctx.controllerHome),
            sessionCache: sessionCacheGlobalDiagnostics(),
          },
        });
      }
      case 'workflow_watchdog_report': {
        const repository = selected(ctx, args);
        return result(buildWorkflowWatchdogReport(ctx.controllerHome, repository, { staleMinutes: args.stale_minutes, includeProcesses: args.include_processes }) as unknown as Record<string, unknown>);
      }
      case 'ios_xcode_status':
      case 'ios_simulators_list':
      case 'ios_project_discover':
      case 'ios_schemes_list':
      case 'ios_simulator_boot':
      case 'ios_app_build':
      case 'ios_simulator_screenshot':
      case 'ios_ui_smoke_test':
        return legacyIosPluginAction(ctx, name, args);
      case 'ios_app_install':
      case 'ios_app_launch':
      case 'ios_simulator_log_tail':
        return result({
          accepted: false,
          mode: 'compatibility_migration',
          path: 'plugin_action_execute',
          rejectCode: 'LEGACY_IOS_ATOMIC_RETIRED',
          message: `${name} no longer owns an independent iOS execution path. Use plugin_action_execute with plugin_id=ios and action_id=smoke_review for staged simulator validation.`,
          migration: { tool: 'plugin_action_execute', plugin_id: 'ios', action_id: 'smoke_review' },
        }, true);
      case 'runtime_cleanup_preview': {
        const repository = selected(ctx, args);
        const preview = previewRuntimeCleanup(repository.canonicalRoot, {
          minAgeMinutes: typeof args.min_age_minutes === 'number' ? args.min_age_minutes : undefined,
          includeTempDirs: args.include_temp_dirs !== false,
          includeTerminalLocalJobs: args.include_terminal_local_jobs === true,
          includeLegacyRuns: args.include_legacy_runs === true,
          includeHistoricalAttention: args.include_historical_attention === true,
          maxCandidates: typeof args.max_candidates === 'number' ? args.max_candidates : undefined,
        });
        return result({ ...preview });
      }
      case 'runtime_cleanup_apply': {
        const repository = selected(ctx, args);
        const applied = applyRuntimeCleanup(repository.canonicalRoot, {
          minAgeMinutes: typeof args.min_age_minutes === 'number' ? args.min_age_minutes : undefined,
          includeTempDirs: args.include_temp_dirs !== false,
          includeTerminalLocalJobs: args.include_terminal_local_jobs === true,
          includeLegacyRuns: args.include_legacy_runs === true,
          includeHistoricalAttention: args.include_historical_attention === true,
          maxCandidates: typeof args.max_candidates === 'number' ? args.max_candidates : undefined,
          confirmCleanup: args.confirm_cleanup === true,
        });
        return result({ ...applied });
      }
      case 'work_result_summary': {
        const repository = selected(ctx, args);
        const jobId = String(args.job_id ?? '').trim();
        const job = getExecutionJob(ctx.controllerHome, repository.repoId, jobId);
        const taskLedger = buildControllerTaskLedgerProjection(repository.canonicalRoot);
        return result({
          summary: summarizeJobResultForLowInterception(job),
          taskLedgerStatus: taskLedger.status,
          next: taskLedger.status.nextAction,
        });
      }
      case 'work_status_digest': {
        const repository = selected(ctx, args);
        const workRef = String(args.work_ref ?? '').trim();
        let job: ExecutionJob | undefined;
        try { job = getExecutionJob(ctx.controllerHome, repository.repoId, workRef); }
        catch { job = undefined; }
        const taskLedger = buildControllerTaskLedgerProjection(repository.canonicalRoot);
        if (job) {
          return result({
            digest: summarizeJobResultForLowInterception(job),
            workRef,
            taskLedgerStatus: taskLedger.status,
            next: taskLedger.status.nextAction,
          });
        }
        const contract = getWorkContract({ controllerHome: ctx.controllerHome, repoId: repository.repoId }, workRef);
        if (contract) {
          const continuation = buildWorkContinuationSnapshot(contract);
          return result({
            digest: continuation,
            workRef,
            taskLedgerStatus: taskLedger.status,
            next: continuation.nextSafeAction,
          }, contract.status === 'failed' || continuation.reconciliationRequired);
        }
        const process = getRepositoryCommandProcess(ctx.controllerHome, repository.repoId, workRef);
        if (!process) return result({ error: { code: 'WORK_NOT_FOUND', message: 'No Work or managed process matched work_ref.', errorClass: 'not_found', summary: '未找到对应任务。' } }, true);
        const digest = managedProcessOperationDigest(process);
        return result({
          digest,
          workRef,
          taskLedgerStatus: taskLedger.status,
          next: process.completed === true
            ? 'Managed process is terminal; inspect the bounded digest above.'
            : `Continue independent work. Use process_get only if an observation can change the next decision; join once with process_wait when this exact result becomes a dependency. Do not re-run the original operation.`,
        }, digest.phase === 'failed' || digest.phase === 'timed_out');
      }
      case 'request_release_gate': {
        const repository = selected(ctx, args);
        const requestId = typeof args.request_id === 'string' && args.request_id.trim()
          ? args.request_id.trim()
          : `release:${repository.repoId}:${Math.floor(Date.now() / 60_000)}`;
        return result({
          accepted: false,
          mode: 'external_controller_required',
          requestId,
          repoId: repository.repoId,
          rejectCode: 'EXECUTION_JOB_RETIRED',
          message: 'Release Gate no longer creates an ExecutionJob. An external Controller must claim the related Work and execute release evidence explicitly.',
          suggestedOperation: 'rh_work.controller_claim followed by Process Runtime checks and explicit release authorization.',
        });
      }
      default: return undefined;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const structuredCode = /^([A-Z][A-Z0-9_]+)(?::|$)/.exec(message)?.[1];
    return result({ error: { code: structuredCode ?? 'RUNTIME_TOOL_FAILED', message } }, true);
  }
}

export { RH_WORK_VERIFY_LEASE_WAIT_MS, runtimeIdentitySnapshot, dispatchedChatgptRelayAuthorizesStaleControllerRecovery, sessionlessFacadeControllerAuthorityMatches } from './work-adapter';
export type { RuntimeIdentitySnapshot } from './work-adapter';
