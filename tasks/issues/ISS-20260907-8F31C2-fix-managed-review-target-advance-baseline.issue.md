---
id: "ISS-20260907-8F31C2"
kind: "bug"
status: "implementation"
updated_at: "2026-09-07T08:33:11.869235Z"
source: "forge"
---

# Fix managed review target-advance baseline

Managed isolated Work review incorrectly attributes already-incorporated target-only commits to the Work when deliveryBaseCommit still points at the preparation base, causing false WORK_IMPLEMENTATION_REVIEW_SCOPE_VIOLATION before finalize can persist target-advance provenance.

## Goals

- Use an exact target-relative review base only when the recorded delivery base linearly reaches the current target and that target is already contained by the managed candidate.
- Keep review baseline reconciliation read-only; persist deliveryBaseCommit only through existing delivery transitions.
- Preserve fail-closed behavior for unincorporated, rewritten, or conflicting target history and out-of-scope Work changes.

## Non-goals

- Relax implementation review scope enforcement.
- Create a second Work delivery authority.
- Rewrite historical Work baseRevision.

## Acceptance Criteria

- [ ] Managed implementation review excludes target-only commits already incorporated into the candidate.
- [ ] Unincorporated later target advances are not silently excluded from the review base.
- [ ] No Work allowed-path widening or baseRevision mutation is used as a workaround.
- [ ] Focused regression and TypeScript checks pass.

## GitHub

- Not published.

## Tasks

### T1 — Reconcile managed review baseline after contained target advance

- Status: `implementation`
- Objective: Exclude only proven target-owned history from managed Work implementation-review changed paths before finalization.
- Depends on: none
- Allowed paths: `src/runtime/control-plane/execution/work-finalization-service.ts`, `tests/runtime/rh-work-terminalization-authority.test.ts`, `tasks/issues/**`
- Checks: `package:check:type`
- Execution hint: selected at runtime

## Related Artifacts

- `src/runtime/control-plane/execution/work-finalization-service.ts`
- `tests/runtime/rh-work-terminalization-authority.test.ts`
- `work:work-forge-v2-plan-work-semantic-admi-591f72ae`
- `work:work-managed-isolated-work-target-bra-53391473`
