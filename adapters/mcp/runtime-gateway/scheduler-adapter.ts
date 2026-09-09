import type { McpToolDefinition, CallToolResult } from '../../../packages/protocols/mcp/tool-contract';
import type { MultiRepositoryMcpToolContext } from '../multi-repository';
import { boundedPluginArtifactImageContent, jsonPreview, result, resultWithPluginArtifactImages } from './result-adapter';
import { expectedRevision, repositoryRootForRepoId, selected, stringList } from './shared-adapter';
import { applyScheduleDedupe, buildScheduleDedupeReport } from '../../../packages/kernel/scheduler/api/index';



export async function callSchedulerAdapter(ctx: MultiRepositoryMcpToolContext, name: string, args: Record<string, unknown>): Promise<CallToolResult | undefined> {
  try {
    switch (name) {
      case 'schedule_dedupe_report': {
              const repository = selected(ctx, args);
              return result({ report: buildScheduleDedupeReport(ctx.controllerHome, repository.repoId) });
            }
      case 'schedule_dedupe_apply': {
              const repository = selected(ctx, args);
              return result({ dedupe: applyScheduleDedupe(ctx.controllerHome, repository.repoId, { dryRun: args.dry_run, confirmAuthorization: args.confirm_authorization }) });
            }
      default: return undefined;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const structuredCode = /^([A-Z][A-Z0-9_]+)(?::|$)/.exec(message)?.[1];
    return result({ error: { code: structuredCode ?? 'RUNTIME_TOOL_FAILED', message } }, true);
  }
}
