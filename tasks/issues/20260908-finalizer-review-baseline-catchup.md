# Finalizer loses reviewed changed-path identity after exact target catch-up

Status: fixed in dedicated repair Work `work-fix-work-finalization-review-bas-4af4cc36`.

## Finding

During r4 certification cleanup, a narrow Work was reviewed and successfully committed as `6baef5b77d5cb77a0fb8f9002fe5eb6cb4325f46`. Forge then merged that exact candidate to `kernel-v2/architecture`, but the post-merge cleanup gate immediately classified the same approved review as stale (`workspace content fingerprint changed; changed-path identity changed`).

The WorkHandle proved `state=merged`, `merge=done`, `baseCommit=deliveryBaseCommit=8b0a75e9...`, and `expectedHead=6baef5b7...`; the target also resolved to the same candidate HEAD. `implementationReviewCommittedBaseRevision()` nevertheless switched its review baseline from the durable delivery base to target HEAD because its exact-catch-up exception only handled the unusual case where `deliveryBaseCommit` differed from `baseCommit`. That collapsed the reviewed two-path delta to an empty target-relative path set during cleanup.

## Resolution

Preserve the durable delivery base when the target equals candidate HEAD and the WorkHandle is already in durable `merged` state. Before Forge has delivered the Work, retain the existing target-relative behavior so an externally pre-integrated candidate cannot claim target history as Work-owned review scope.

## Verification

A focused regression covers both sides of the boundary with `deliveryBaseCommit === baseCommit`: before delivery, target-relative baseline remains candidate HEAD; after durable `merged` state, cleanup review baseline remains the original delivery base. Existing target-advance baseline tests must remain green, followed by TypeScript and runtime-architecture gates.
