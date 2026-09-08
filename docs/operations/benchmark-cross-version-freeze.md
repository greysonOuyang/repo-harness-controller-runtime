# Cross-version benchmark freeze authority

This runbook is an audit index for the S5 cross-version freeze. Machine authority lives in `evaluation/frozen-cross-version-authority.json`, `evaluation/aa-calibration.json`, `evaluation/baselines/v1.7.2/reconstruction.json`, and `evaluation/baselines/v1.7.2/authority.json`; this document never overrides those records.

## Frozen S5 authority

- Evaluator implementation: `sha256:17141479c81c22a26c1a81a61260a93c7afdf43592aac495cea113b2d69f4a0d`
- Shared corpus: `sha256:cd45a4ff9b3a5a7b84aed736f72fd7d920115225c2b35fcb74fd0e80337233ee`
- Formal protocol: `sha256:015f2a5c16e135341d6e531e3e6bca7d902d1c361f933c0d1be15981c3e8236d`
- Baseline identity: `sha256:1a496185beb3776588884b4cac513a23b65a44a66f54e506eab0d3fe1ef6f727`
- Baseline reconstruction: `sha256:d9a0a99a5bf7eeccdbaf2f186bceeaf8a29b33400e8ac6d9c21edfb1d0d0fc3b`
- Baseline output authority: `sha256:46f99c71b4ae68d2e2dc9741f51a8bfa5cac06155011e997d00b982ffd44438d`
- A/A calibration: `sha256:ddc9e18f592403af88e0f4ed1e3c7ac835253661a5416fdc3e1767a3dd2fd8c1`
- Environment policy: `sha256:5f740890588e533517eb8878e2326867e911d5b6a9240c7dcdba2272883c5904`

The evaluator identity includes the `01616fdbc55da77a9bad34ac94bc382c9fdd811a` process-isolation supervision repair and the candidate-neutral execution, validation, statistics, baseline-validation, and process-tree dependencies listed by `CROSS_VERSION_EVALUATOR_FILES`. Any change to those inputs creates a new evaluator authority and requires a new S5 A/A calibration before S6 evidence is valid.

## Reproducible v1.7.2 baseline

The source remains tag `v1.7.2`, commit `c873cfeb11a223ced342e7101c016261b4a93b38`, with published tarball SHA-256 `2073bf8a6ab377e63ebe109c197039647bcf0626fb357954156c9f83f429fb10`.

The historical runnable artifact `sha256:52ef73f9299d84895cd1a0692bf53023608dff6bc4ba29942a8f8d2bc3837db0` is retained only as historical evidence. The current S5 baseline is rebuilt from the exact published tarball plus the committed normalized release lock and exact installer recipe. Two independent strictly-offline builds produced the same full runnable artifact `sha256:1a0bb50ad97c414f4c553ef790b29c8786a76d0f6ca29e04bbd9fed3bb46d43e`.

The output authority also binds the production dependency graph: 100 package entries, 99 unique content blobs, graph digest `sha256:4acfb83f4e977d16a077020e3c3279dedaf7e307f12d06a99d8fb2701c78c16c`. Temporary build directories and cleaned Process records are audit evidence, not reconstruction dependencies.

## v1.7.2 A/A calibration

Fresh A/A Process `proc_mts933t2_6958211c` used the same current baseline artifact on both arms across the 24-scenario shared corpus. All 48 trials passed with zero candidate failures or timeouts.

For latency, the signed delta is arm B minus arm A, one paired sample per scenario. Mean delta was `-45.927 ms`, p50 `-2.590 ms`, p95 `123.702 ms`, with 9 positive and 15 negative samples. The scenario-blocked 95% confidence interval was `[-115.439 ms, 23.584 ms]`; because it crosses zero, the run does not establish a systematic harness arm advantage. This is symmetry/noise calibration only, never V2 superiority evidence or a regression tolerance.

The raw evidence bundle contains `experiment.json`, `statistics.json`, and 24 scenario JSON files. For this freeze, `rawBundleDigest` is reproducible as `sha256(JSON.stringify(manifest))`, where `manifest` has schema `forge-aa-raw-bundle-manifest/v1` and lists every raw JSON file sorted by relative path with its SHA-256 and byte length. The resulting digest is `sha256:5a7132aa15aabbafd3067c96771e7f828c747c307ceba496681752ca8b6e5081`. Earlier S5 commits stored raw bundle digests without preserving their construction algorithm, so this documented convention starts with this freeze rather than pretending that missing provenance existed.

## Process-isolation and S6 gate

`package:check:evaluation-framework` must pass on the frozen source before S5 is accepted. Timed candidate and warmup paths must reclaim evaluator-owned process trees; any recurrence of residual children invalidates the freeze rather than justifying threshold adjustment or result filtering.

S6 must not start until Kernel V2 has an immutable release candidate. Formal A/B must use the exact frozen evaluator, corpus, protocol, baseline, A/A, and environment authorities above, keep shared-capability A/B separate from V2-only expansion, and keep correctness/reliability blocking ahead of efficiency or performance gains.
