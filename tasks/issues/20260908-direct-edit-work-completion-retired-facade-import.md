# direct-edit completion retained retired Work facade import

Status: fixed in a dedicated repair Work discovered during r4 ControllerRound certification.

## Finding

`package:check:runtime-architecture` failed on the current baseline before the r4 certification Work had changed any production source. `src/runtime/control-plane/execution/direct-edit-work-completion.ts` already consumed the canonical `packages/kernel/work/api/index` for Work authority, but still imported `implementationReviewChangedPathDigest` from the retired `src/runtime/control-plane/facade/work-implementation-review` surface.

The architecture rule intentionally rejects production imports from `work-contract-store`, `work-state-machine`, or `work-implementation-review`; weakening that rule would hide an authority regression.

## Resolution

Import `implementationReviewChangedPathDigest` from the canonical Kernel Work API, where the function is already exported by `packages/kernel/work/domain/implementation-review.ts` through `packages/kernel/work/api/index.ts`. No behavior or lifecycle policy changes are required.

## Verification

Run `package:check:type` and `package:check:runtime-architecture`. The repair is complete only if both pass without changing the architecture rule.
