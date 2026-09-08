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

- Candidate source revision: `4c252cac1b0d725b6ac3c7f645c8c631ed6f1eb6`
- Candidate release artifact digest: `sha256:a0a4d6cc26a6d63b953241590c43b0eba1edb1f37693a642460a19d5859cc261`
- Candidate package tarball SHA-256: `a5ff1ed58fc66113e6065b3ddddf3a71d8fecec7048028e96c5680116ffd782c`
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
/tmp/forge-v2-ab-final-resource2-1788960000
```

Its manifest is `sha256:c909ee48b32cbaf15d607235a15f111057ea200ab5617116f66378bb09ebab9d`;
the `statistics.json` SHA-256 is
`7581a1804f056c2459483f97d6e965a79d6734875cfa984ea2dbfa8766aeb9fd`.
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
- `latency_ms`: baseline mean `329.381 ms`, candidate mean `350.254 ms`; the
  runner's paired relative mean is `+10.92%`, with a scenario-blocked 95%
  relative interval `[+4.78%, +17.06%]`. The paired aggregate is marked
  regressed and does not establish the required 15% improvement subset.
- `peak_rss_bytes`: baseline mean `47,465,472`, candidate mean `47,572,651`
  (`+0.29%` relative; scenario-blocked 95% interval `[-0.23%, +0.82%]`).
- `cpu_ms`: resource accounting is present, but only three scenario blocks have
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
