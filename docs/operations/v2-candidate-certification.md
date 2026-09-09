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

- Candidate source revision: `376d8ad9ad0cafaaf1308f9a16feef73938b240e`
- Candidate release artifact digest: `sha256:181529a2ef22404e19b589c720fe649460202cc1f8f6e449b5325e4a6800e53a`
- Candidate package tarball SHA-256: `8315f0b081724130028da032a082c9e3b0a3acf06aacb5693e141c1105758c45`
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

The completed raw external bundle for this candidate is:

```text
/tmp/forge-v2-ab-final-package-376d8ad9-clean-source
```

Its raw-bundle manifest digest is
`sha256:9e9914832b5b0b9154ca0f3bf71882f319834075e2394240ca768d1c5edcc41b`;
the `statistics.json` SHA-256 is
`6e7e3f997a046c45446dcaae0660ae0c6c10645661693e906efa116716c23877`.
The run used protocol digest
`sha256:b383b97aacc5995ba69525d1aac5f031046c8708db3c32011e484444818d2700`,
evaluator implementation digest
`sha256:7c3b8c1417dbd71705bd53649289a525217cc218392a65b45067a2845bfb367a`,
24 shared scenarios, both cache modes, three repetitions, and both arms
(144 paired samples). It ran from a clean detached snapshot of the candidate
source revision so unrelated dirty work in the main checkout could not alter
the isolation receipt. Every trial completed without a candidate failure or
timeout.

Observed metrics:

- `task_correctness`: 100% on both arms; no newly introduced failures or
  timeouts.
- `tool_interaction_count`: measured and identical (mean `1.5417` on both
  arms).
- `latency_ms`: baseline mean `256.504 ms`, candidate mean `286.262 ms`; the
  paired relative mean is `+15.06%`, with a scenario-blocked 95% interval
  `[+9.75%, +20.38%]`. The paired aggregate is slower and does not establish
  the required 15% improvement subset.
- `peak_rss_bytes`: baseline mean `47,516,217`, candidate mean `47,519,516`
  (`+0.007%` relative; scenario-blocked 95% interval `[-0.041%, +0.055%]`).
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
