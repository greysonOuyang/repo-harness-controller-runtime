import { randomUUID } from 'crypto';
import {
  acknowledgeControllerRoundClaim,
  beginInitialControllerRoundDispatch,
  beginControllerRoundRelayAfterRelease,
  finishControllerRoundRelayDispatch,
  getControllerRoundRelay,
  getControllerSession,
  releaseControllerSessionWithAuthority,
  requireControllerOwnershipAuthority,
  submitControllerRoundDisposition,
} from '../../../../packages/kernel/controller/api/index';
import { chatgptControllerRoundBinding, recordChatgptControllerRoundTabSettlement, renderChatgptControllerRoundPrompt } from '../../root/controller-round-composition';
import { readExecutionSession, updateExecutionSession } from '../execution/session-store';
import { runWorkChatgptContinuation, type WorkChatgptContinuationResult } from './chatgpt-work-continuation';

export const SOURCE_ROUND_CONTINUATION_INSTRUCTION =
  '当前为 Forge V2 源码自动续跑模式。若 Goal 尚未完成且无真实 blocker，本轮不要调用已安装旧 Runtime 的普通 controller_release；请通过当前源码执行 `bun src/cli/index.ts chatgpt round-continue --controller-home <controller-home> --repo-id <repo-id> --work-id <work-id> --controller-authority-id <controller_authority_id> --relay-scope-id <relay_scope_id>`。该命令会原子执行 continue_immediately、释放当前 claim，并用当前源码立即投递下一 ControllerRound。';


export interface SourceChatgptRoundOpenInput {
  controllerHome: string;
  repoId: string;
  repoRoot: string;
  workId: string;
  controllerId: string;
  principalId: string;
  controllerInstanceId?: string;
  continuationPrompt?: string;
  timeoutMs?: number;
}

export interface SourceChatgptRoundOpenResult {
  relayStatus: string;
  controllerAuthorityId: string;
  relayScopeId: string;
  dispatch: WorkChatgptContinuationResult;
}

export async function openChatgptControllerRoundFromSource(
  input: SourceChatgptRoundOpenInput,
  dependencies: { dispatch?: typeof runWorkChatgptContinuation } = {},
): Promise<SourceChatgptRoundOpenResult> {
  const store = { controllerHome: input.controllerHome, repoId: input.repoId };
  const binding = chatgptControllerRoundBinding(store, input.workId);
  const relay = beginInitialControllerRoundDispatch(store, {
    workId: input.workId,
    identity: {
      controllerId: input.controllerId.trim(),
      controllerType: 'chatgpt',
      principalId: input.principalId.trim(),
      controllerInstanceId: input.controllerInstanceId?.trim() || 'source-v2-launcher',
      sessionId: `source-v2-launch-${randomUUID()}`,
    },
    bindingId: binding?.bindingId,
  });
  if (relay.status === 'blocked' || !relay.authorityId) {
    throw new Error(`CONTROLLER_RELAY_LAUNCH_BLOCKED: ${relay.blockedReason ?? relay.relayScopeId}`);
  }
  const prompt = [
    renderChatgptControllerRoundPrompt(store, relay, { exactOriginWork: true }),
    SOURCE_ROUND_CONTINUATION_INSTRUCTION,
    input.continuationPrompt?.trim() ? `Continuation: ${input.continuationPrompt.trim()}` : '',
  ].filter(Boolean).join('\n\n');
  const dispatch = dependencies.dispatch ?? runWorkChatgptContinuation;
  const dispatched = await dispatch({
    controllerHome: input.controllerHome,
    repoId: input.repoId,
    repoRoot: input.repoRoot,
    workId: input.workId,
    prompt,
    controllerAuthorityId: relay.authorityId,
    relayScopeId: relay.relayScopeId,
    browserSessionId: binding?.browserSessionId,
    conversationUrl: binding?.conversationUrl,
    tabPolicy: 'reuse',
    timeoutMs: input.timeoutMs,
  });
  if (dispatched.status === 'failed') {
    const message = `${dispatched.error?.code ?? 'CONTROLLER_RELAY_DISPATCH_FAILED'}:${dispatched.error?.message ?? 'Controller relay dispatch failed'}`;
    finishControllerRoundRelayDispatch(store, {
      workId: input.workId,
      ok: false,
      error: message,
      outcomeUnknown: dispatched.providerDeliveryStatus === 'outcome_unknown',
    });
    throw new Error(message);
  }
  const updatedBinding = chatgptControllerRoundBinding(store, input.workId);
  const completed = finishControllerRoundRelayDispatch(store, {
    workId: input.workId,
    ok: true,
    bindingId: updatedBinding?.bindingId,
  });
  return {
    relayStatus: completed?.status ?? 'missing',
    controllerAuthorityId: relay.authorityId,
    relayScopeId: relay.relayScopeId,
    dispatch: dispatched,
  };
}

export interface SourceChatgptRoundContinueInput {
  controllerHome: string;
  repoId: string;
  repoRoot: string;
  workId: string;
  controllerAuthorityId: string;
  relayScopeId: string;
  reason?: string;
  timeoutMs?: number;
}

export interface SourceChatgptRoundContinueResult {
  dispositionStatus: string;
  relayStatus: string;
  relayWorkId: string;
  dispatch: WorkChatgptContinuationResult;
}

export async function continueChatgptControllerRoundFromSource(
  input: SourceChatgptRoundContinueInput,
  dependencies: { dispatch?: typeof runWorkChatgptContinuation } = {},
): Promise<SourceChatgptRoundContinueResult> {
  const store = { controllerHome: input.controllerHome, repoId: input.repoId };
  const initialRelay = getControllerRoundRelay(store, input.workId);
  if (!initialRelay) throw new Error(`CONTROLLER_RELAY_ROUND_NOT_OPEN: ${input.workId}`);
  if (initialRelay.authorityId !== input.controllerAuthorityId.trim()) throw new Error(`CONTROLLER_RELAY_AUTHORITY_MISMATCH: ${input.workId}`);
  if (initialRelay.relayScopeId !== input.relayScopeId.trim()) throw new Error(`CONTROLLER_RELAY_SCOPE_MISMATCH: ${input.workId}`);

  // The installed Runtime may be older than the source under canary. It is authoritative only
  // for establishing the exact live ControllerSession owner. Reconcile that durable owner
  // through the current source state machine before deciding whether this round is claimed.
  const owner = getControllerSession(store, input.workId);
  if (!owner) throw new Error(`CONTROLLER_RELAY_ACTIVE_CLAIM_REQUIRED: ${input.workId}`);
  if (owner.controllerType !== 'chatgpt') throw new Error(`CONTROLLER_RELAY_CHATGPT_ONLY: ${input.workId}`);
  const ownerAuthority = requireControllerOwnershipAuthority(owner, input.workId);
  const relay = acknowledgeControllerRoundClaim(store, { workId: input.workId, session: owner });
  if (!relay) throw new Error(`CONTROLLER_RELAY_ROUND_NOT_OPEN: ${input.workId}`);
  if (relay.authorityId !== input.controllerAuthorityId.trim()) throw new Error(`CONTROLLER_RELAY_AUTHORITY_MISMATCH: ${input.workId}`);
  if (relay.relayScopeId !== input.relayScopeId.trim()) throw new Error(`CONTROLLER_RELAY_SCOPE_MISMATCH: ${input.workId}`);
  if (relay.status !== 'claimed') throw new Error(`CONTROLLER_RELAY_ROUND_NOT_CLAIMED: ${relay.status}`);
  const identity = {
    controllerId: owner.controllerId,
    controllerType: owner.controllerType,
    principalId: ownerAuthority.principalId,
    controllerInstanceId: ownerAuthority.controllerInstanceId,
    sessionId: owner.sessionId,
    claimGeneration: ownerAuthority.claimGeneration,
  };
  const binding = chatgptControllerRoundBinding(store, input.workId);
  const disposition = submitControllerRoundDisposition(store, {
    workId: input.workId,
    identity,
    disposition: 'continue_immediately',
    relayScopeId: input.relayScopeId,
    requirementId: relay.requirementId,
    bindingId: binding?.bindingId,
    reason: input.reason ?? 'source_v2_immediate_continuation',
  });
  if (disposition.status !== 'pending_release') {
    throw new Error(`CONTROLLER_RELAY_CONTINUATION_NOT_PENDING_RELEASE: ${disposition.status}`);
  }

  const released = releaseControllerSessionWithAuthority(store, {
    workId: input.workId,
    actor: `source-chatgpt-round-continue:${owner.controllerId}`,
    authority: ownerAuthority,
  });
  if (!released.allowed) throw new Error(`WORK_CONTROLLER_RELEASE_FENCED: ${input.workId}:${released.reason}`);

  const sessionIdentity = {
    sessionId: owner.sessionId,
    principalId: ownerAuthority.principalId,
    controllerInstanceId: ownerAuthority.controllerInstanceId,
  };
  const executionSession = readExecutionSession(input.controllerHome, sessionIdentity);
  if (executionSession?.activeWorkId === input.workId) {
    updateExecutionSession(input.controllerHome, sessionIdentity, { activeWorkId: undefined, lastValidatedAt: new Date().toISOString() });
  }

  const nextRelay = beginControllerRoundRelayAfterRelease(store, { workId: input.workId, releasedSession: owner });
  if (!nextRelay || nextRelay.status !== 'dispatching' || !nextRelay.authorityId) {
    throw new Error(`CONTROLLER_RELAY_IMMEDIATE_DISPATCH_NOT_READY: ${nextRelay?.status ?? 'missing'}`);
  }
  const relayWorkId = nextRelay.originWorkId;
  const relayBinding = chatgptControllerRoundBinding(store, relayWorkId);
  const predecessorBinding = relayWorkId !== input.workId ? chatgptControllerRoundBinding(store, input.workId) : undefined;
  const prompt = `${renderChatgptControllerRoundPrompt(store, nextRelay)}\n\n${SOURCE_ROUND_CONTINUATION_INSTRUCTION}`;
  const dispatch = dependencies.dispatch ?? runWorkChatgptContinuation;
  const dispatched = await dispatch({
    controllerHome: input.controllerHome,
    repoId: input.repoId,
    repoRoot: input.repoRoot,
    workId: relayWorkId,
    prompt,
    controllerAuthorityId: nextRelay.authorityId,
    relayScopeId: nextRelay.relayScopeId,
    browserSessionId: relayBinding?.browserSessionId ?? predecessorBinding?.browserSessionId,
    conversationUrl: relayBinding?.conversationUrl ?? predecessorBinding?.conversationUrl,
    tabPolicy: 'reuse',
    timeoutMs: input.timeoutMs,
  });
  if (dispatched.status === 'failed') {
    const message = `${dispatched.error?.code ?? 'CONTROLLER_RELAY_DISPATCH_FAILED'}:${dispatched.error?.message ?? 'Controller relay dispatch failed'}`;
    finishControllerRoundRelayDispatch(store, {
      workId: relayWorkId,
      ok: false,
      error: message,
      outcomeUnknown: dispatched.providerDeliveryStatus === 'outcome_unknown',
    });
    throw new Error(message);
  }

  recordChatgptControllerRoundTabSettlement(store, {
    workId: relayWorkId,
    relayScopeId: nextRelay.relayScopeId,
    status: 'retained_for_immediate_continuation',
  });
  const updatedBinding = chatgptControllerRoundBinding(store, relayWorkId);
  const completed = finishControllerRoundRelayDispatch(store, {
    workId: relayWorkId,
    ok: true,
    bindingId: updatedBinding?.bindingId,
  });
  return {
    dispositionStatus: disposition.status,
    relayStatus: completed?.status ?? 'missing',
    relayWorkId,
    dispatch: dispatched,
  };
}
