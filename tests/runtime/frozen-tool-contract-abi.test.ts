import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import {
  buildFrozenSemanticCompatibilityCapability,
  parseFrozenSemanticCompatibilityCapability,
} from '../../adapters/mcp/frozen-client-semantic-compatibility';
import {
  hydrateRecoveryToolArguments,
  recoveryStatusDerivedArguments,
} from '../../adapters/mcp/runtime-gateway/recovery-tool-contract';
import { RECOVERY_TOOLS } from '../../src/runtime/standalone-recovery/entry';

const activationTool = RECOVERY_TOOLS.find((tool) => tool.name === 'activate_runtime_release');
if (!activationTool) throw new Error('activate_runtime_release schema is required for Tool Contract ABI regression');
const activationSchema = activationTool.inputSchema;

const recoveryStatus = {
  identity: {
    host: 'forge-host.local',
    platform: 'darwin',
    controllerHome: '/Users/test/.forge/controller',
    recovery: { releaseRevision: 'recovery-r7' },
    targetRuntime: {
      id: 'launchd:com.moretea.forge.runtime:release-a',
      activeReleaseId: 'release-a',
      authorityRevision: 17,
    },
  },
};

const architectureScript = resolve(import.meta.dir, '../../scripts/check-runtime-architecture.mjs');
function runPrefixFixture(sources: Array<{ path: string; source: string }>, allowed: string[]) {
  return spawnSync(process.execPath, [architectureScript], {
    cwd: resolve(import.meta.dir, '../..'),
    env: {
      ...process.env,
      FORGE_CAPABILITY_PREFIX_GUARDRAIL_FIXTURE: JSON.stringify({ sources, allowed }),
    },
    encoding: 'utf8',
  });
}

describe('Tool Contract ABI authority', () => {
  test('exported Recovery activation schema is representable from frozen caller args plus runtime_status', () => {
    const hydrated = hydrateRecoveryToolArguments({
      toolName: 'activate_runtime_release',
      inputSchema: activationSchema,
      args: { request_id: 'activate-contract-r1', release_path: '/tmp/release-a/manifest.json' },
      status: recoveryStatus,
    });
    expect(hydrated).toMatchObject({
      expected_host: 'forge-host.local',
      expected_platform: 'darwin',
      expected_controller_home: '/Users/test/.forge/controller',
      expected_recovery_release: 'recovery-r7',
      expected_target_runtime: 'launchd:com.moretea.forge.runtime:release-a',
      expected_active_release_id: 'release-a',
      expected_authority_revision: 17,
    });
  });

  test('Recovery hydration never overwrites a complete explicit identity or stale CAS expectation', () => {
    const hydrated = hydrateRecoveryToolArguments({
      toolName: 'activate_runtime_release',
      inputSchema: activationSchema,
      args: {
        request_id: 'activate-contract-r2',
        release_path: '/tmp/release-b/manifest.json',
        expected_host: 'wrong-host.local',
        expected_platform: 'darwin',
        expected_controller_home: '/stale/controller',
        expected_recovery_release: 'stale-recovery',
        expected_target_runtime: 'launchd:stale-runtime',
        expected_active_release_id: 'stale-release',
        expected_authority_revision: 3,
      },
      status: recoveryStatus,
    });
    expect(hydrated.expected_host).toBe('wrong-host.local');
    expect(hydrated.expected_controller_home).toBe('/stale/controller');
    expect(hydrated.expected_recovery_release).toBe('stale-recovery');
    expect(hydrated.expected_target_runtime).toBe('launchd:stale-runtime');
    expect(hydrated.expected_active_release_id).toBe('stale-release');
    expect(hydrated.expected_authority_revision).toBe(3);
  });

  test('partial explicit Recovery machine identity is rejected instead of mixing caller and server provenance', () => {
    expect(() => hydrateRecoveryToolArguments({
      toolName: 'activate_runtime_release',
      inputSchema: activationSchema,
      args: {
        request_id: 'activate-contract-r3',
        release_path: '/tmp/release-c/manifest.json',
        expected_host: 'caller-host.local',
      },
      status: recoveryStatus,
    })).toThrow('RECOVERY_TOOL_IDENTITY_PARTIAL:activate_runtime_release');
  });

  test('unknown required Recovery fields fail before mutation instead of leaking into server parameter errors', () => {
    expect(() => hydrateRecoveryToolArguments({
      toolName: 'future_recovery_mutation',
      inputSchema: { type: 'object', required: ['request_id', 'future_fence'] },
      args: { request_id: 'future-contract-r1' },
      status: recoveryStatus,
    })).toThrow('RECOVERY_TOOL_SCHEMA_UNREPRESENTABLE:future_recovery_mutation:future_fence');
  });

  test('Recovery status projection does not invent absent CAS values', () => {
    const derived = recoveryStatusDerivedArguments({
      identity: {
        host: 'forge-host.local',
        platform: 'darwin',
        controllerHome: '/controller',
        recovery: {},
        targetRuntime: { id: 'launchd:runtime:none' },
      },
    });
    expect(derived.expected_recovery_release).toBe('none');
    expect(derived).not.toHaveProperty('expected_active_release_id');
    expect(derived).not.toHaveProperty('expected_authority_revision');
  });

  test('semantic.v1 carries frozen work review without inventing another capability prefix', () => {
    const capability = buildFrozenSemanticCompatibilityCapability({
      operation: 'work_review',
      args: { decision: 'approved' },
    });
    expect(capability).toStartWith('semantic.v1:');
    expect(parseFrozenSemanticCompatibilityCapability('repair', capability)).toEqual({
      operation: 'work_review',
      args: { decision: 'approved' },
    });
    expect(() => buildFrozenSemanticCompatibilityCapability({
      operation: 'work_review',
      args: { decision: 'maybe' as 'approved' },
    })).toThrow('FROZEN_SEMANTIC_COMPATIBILITY_INVALID');
  });

  test('architecture guardrail rejects new ad-hoc capability prefixes and forces legacy debt to shrink', () => {
    const introduced = runPrefixFixture([
      { path: 'adapters/mcp/runtime-gateway/fake.ts', source: `const prefix = 'future.compat:';` },
    ], []);
    expect(introduced.status).toBe(1);
    expect(introduced.stderr).toContain('introduced forbidden entry');

    const retired = runPrefixFixture([], ['adapters/mcp/runtime-gateway/fake.ts::legacy.compat:']);
    expect(retired.status).toBe(1);
    expect(retired.stderr).toContain('allowlist contains retired entry');

    const canonical = runPrefixFixture([
      { path: 'adapters/mcp/frozen-client-semantic-compatibility.ts', source: `const prefix = 'semantic.v1:';` },
    ], []);
    expect(canonical.status).toBe(0);
  });
});

