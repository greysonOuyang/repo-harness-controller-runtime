# Deferred Goal Ledger

> **Status**: Backlog
> **Updated**: 2026-09-04
> **Scope**: Human-maintained deferred goals only. Active Requirement/Plan/Work state lives in Forge Controller Home.

This file is durable project knowledge, not an execution queue or Runtime projection.

## Deferred Goals

| Goal | Why Deferred | Tradeoff | Revisit Trigger |
|------|--------------|----------|-----------------|
| Complete historical macOS Automation/TCC cleanup and macOS-only browser live acceptance | Forge source optimization is moving to Forge Cloud Windows. Selector-bound System Settings cleanup, Accessibility/Screen Recording/Automation grants, and Chrome Apple Events behavior require the macOS host and sometimes user-presence confirmation. | Historical macOS principals or unresolved live-browser proof can remain visible even after platform-neutral source fixes; this must not be misreported as Windows-verifiable closure. | Revisit only on the macOS host when exact TCC/browser evidence is required; preserve the signed `Forge Desktop Operator` authority and do not grant equivalent powers to Runtime. |
| Recover/export data from the historical logged-out ChatGPT browser profile | This is account/history recovery rather than Forge product-source correctness and the saved old profile is logged out. | Historical data may remain unavailable, but it does not block Forge source development or release correctness. | Revisit only when the user explicitly asks to recover that account/history and can provide required authentication. |
| Registered check runner storage path must not be rejected by repository policy | `run_check` on a registered EnglishTrainer check failed before executing the check with `CHECK_STORAGE_REPOSITORY_PATH_FORBIDDEN: .../.ai/harness/checks`. The check runner and repository policy disagree about ownership of controller-generated check storage. | Until fixed, registered checks can be falsely reported as failed even when the underlying project check is healthy; direct execution must be treated as diagnostic evidence only, not as a silent replacement authority. | Reproduce with any repo whose registered check runner writes under `.ai/harness/checks`; fix the shared check-storage authority/policy boundary and add regression coverage. |
