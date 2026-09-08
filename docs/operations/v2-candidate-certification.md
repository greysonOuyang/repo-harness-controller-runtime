# Forge 2.0 candidate certification (current evidence)

This report records the current candidate-level evidence for
`plans/plan-20260906-v2-release-ready.md`. It is an authored evidence index;
Controller Home remains the runtime receipt authority.

The machine-checkable certification contract is
`evaluation/lib/certification.ts`. Given an external evidence manifest, run:

```bash
bun run check:v2-certification /absolute/path/to/v2-certification.json
```

The command exits non-zero for missing, failed, unreceipted, or inconclusive
evidence. It does not create Runtime state and it does not turn this report into
an authority. A passing manifest must bind both release identities, the frozen
A/B protocol/result, both platform reports, every engineering-task repeat, and
the integrated lifecycle/failure evidence.

## Candidate and baseline identity

- Candidate source revision: `b47064a6a384427dc10c5a6ec040e39da4e7ea17`
- Candidate release artifact digest: `sha256:74c0172347e0ef0e7d5a385d55ff4716b11bfd7dccbda3a8c800388490b3334d`
- Candidate package tarball SHA-256: `7c56540dbbafb7391ba32e151b7c07683865e8cd1360ca70057c9c1e3e0f0e5c`
- Frozen v1.7.2 source revision: `c873cfeb11a223ced342e7101c016261b4a93b38`
- Published v1.7.2 tarball SHA-256: `2073bf8a6ab377e63ebe109c197039647bcf0626fb357954156c9f83f429fb10`
- Reconstructed v1.7.2 artifact digest: `sha256:1a0bb50ad97c414f4c553ef790b29c8786a76d0f6ca29e04bbd9fed3bb46d43e`
- Historical, non-reconstructible digest retained for provenance only:
  `sha256:52ef73f9299d84895cd1a0692bf53023608dff6bc4ba29942a8f8d2bc3837db0`

The published tarball and normalized dependency lock were rebuilt twice with
the frozen npm 11.19.0 procedure. Both receipts produced the same artifact
digest and 100 production top-level packages. The receipts were generated at:

```text
/tmp/forge-v172-authority-build-1-1788876911035935000.receipt.json
/tmp/forge-v172-authority-build-2-1788876911038875000.receipt.json
```

## Formal macOS A/B

The final raw external bundle is:

```text
/tmp/forge-v2-ab-final-package-1788960000
```

Its manifest is `sha256:36a0f6ce9993ec0bd0365ec6a7167d767b72061b86d89cf7a6407eb62ef1ddb3`;
the `statistics.json` SHA-256 is
`39755104bbd91225249c0fa13c7fb9643127e42d1ca3a3d7838fa6561a2a1918`.
The run used protocol digest
`sha256:14473ca08b47d2a1e4f0905e7e37d580b64e1159e7d8a085f52debc88ea52bd3`,
evaluator implementation digest
`sha256:0d8fc21209caf142d5545eb3b99c3c17674dc1e6f2de91af5443bf2de08c51ad`,
24 shared scenarios, both cache modes, three repetitions, and both arms
(144 paired samples). Every trial completed without a candidate failure or
timeout.

Observed metrics:

- `task_correctness`: 100% on both arms; no newly introduced failures or
  timeouts.
- `tool_interaction_count`: measured and passed.
- `latency_ms`: baseline mean `335.824 ms`, candidate mean `341.393 ms`; the
  runner's paired relative mean is `+9.49%`, with a scenario-blocked 95%
  relative interval `[+3.85%, +15.13%]`. The paired aggregate is slower and
  does not establish the required 15% improvement subset.
- `peak_rss_bytes`: baseline mean `47,548,757`, candidate mean `47,550,236`
  (`+0.0035%` relative; scenario-blocked 95% interval `[-0.057%, +0.064%]`).
- `cpu_ms`: resource accounting is present, but only two scenario blocks have
  non-zero CPU deltas because the host reports short-lived calls at zero CPU
  resolution; this remains insufficient precision for a CPU conclusion.
- `behavioral_invariant_success`, `regression_reintroduction_rate`,
  `impact_coverage`, and `change_precision` were not measured by the shared
  corpus. The runner therefore correctly returned
  `inconclusive_missing_metrics`, rather than treating absent measurements as
  passing zeros.

## Go / No-Go

**NO-GO for V2 release readiness.** The repository and release-package gates
are green, and the shared A/B run shows no correctness or reliability failure,
but the candidate is not yet certifiable because:

1. the required engineering suite (six agent tasks with independent behavioral
   oracles) has no recorded run;
2. required execution-quality metrics are missing from the formal result;
3. the preselected discovery/bounded-mutation subset has not demonstrated the
   required 15% end-to-end improvement and the aggregate paired latency metric
   is regressed;
4. macOS/WSL clean install, upgrade, whole-release rollback, 24-hour stability,
   and 20-cycle reports are not present in this evidence set.

No stable baseline activation, publication, or production promotion is implied
by this report. The next release slice is to produce the missing engineering
and live-platform evidence, then rerun the frozen A/B only if the candidate or
protocol identity changes.
