import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { flushMcpDiagnostics, recordMcpTiming } from '../../src/runtime/diagnostics/mcp-timing';

const homes: string[] = [];

afterEach(async () => {
  await Promise.all(homes.splice(0).map(async (home) => {
    await flushMcpDiagnostics(home);
    rmSync(home, { recursive: true, force: true });
  }));
});

describe('MCP timing diagnostics', () => {
  test('queues writes without synchronously touching the diagnostic file', async () => {
    const home = mkdtempSync(join(tmpdir(), 'forge-mcp-timing-'));
    homes.push(home);
    recordMcpTiming(home, { tool: 'repository_list', totalToolDurationMs: 1 });
    await flushMcpDiagnostics(home);
    expect(readFileSync(join(home, 'audit', 'mcp-timings.jsonl'), 'utf8')).toContain('repository_list');
  });

  test('rotates an oversized timing ledger before appending new diagnostics', async () => {
    const home = mkdtempSync(join(tmpdir(), 'forge-mcp-timing-'));
    homes.push(home);
    const audit = join(home, 'audit');
    const current = join(audit, 'mcp-timings.jsonl');
    mkdirSync(audit, { recursive: true });
    // Use a sparse file: the rotation condition must use filesystem size rather
    // than loading historical diagnostics into the control-plane process.
    writeFileSync(current, 'x');
    const oversized = 32 * 1024 * 1024;
    truncateSync(current, oversized);
    recordMcpTiming(home, { tool: 'repository_list', totalToolDurationMs: 1 });
    await flushMcpDiagnostics(home);
    expect(existsSync(`${current}.previous`)).toBe(true);
    expect(readFileSync(current, 'utf8')).toContain('repository_list');
  });
});
