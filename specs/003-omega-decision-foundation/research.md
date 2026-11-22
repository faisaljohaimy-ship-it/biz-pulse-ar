# OMEGA discovery and design decisions

- **Inventory**: Read source-backed `.audit-tmp/omega-capability-inventory.md` (ignored working evidence) and existing 001/002 specifications, AGENTS/CLAUDE, approved constitution, current simulation/graph/decision contracts and delivery runbook. Source existence is not live operation.
- **Baseline**: Prior delivery is verified c55 / `dpl_3HXBWpF6xMtVFemTLXoAcYxk7Gwf`, confirmed at `2026-11-22 22:27:10 UTC`; its final standalone report records actual delivery. Old tracked 001/002 reports retain precommit checkpoints and must not be mistaken for the latest production state.
- **Three selected capabilities**: #01 transient world projection, #04 rule-based risk hypotheses, #06 isolated what-if. Reuse the existing accepted route/catalog/reducer/report; no new global engine or route.
- **Graph reuse**: Existing knowledge-graph types provide vocabulary/provenance. Server store is an in-process global Map and is not a client persistence layer. An allowed `caused_by` relationship does not establish causality. Use type-only reuse and explicit synthetic evidence.
- **Causality**: No validated structural causal model/intervention evaluator was found in the inspected implementation. Rules may expose evidence/control gaps and hypotheses; no probability, forecast calibration, root-cause proof or physical-validity claim follows.
- **Unsafe alternative rejected**: `src/lib/simulation/exec-scenario.server.ts` purges/inserts operational/simulation rows and may auto-seed. It is not an isolated what-if evaluator and is not invoked.
- **Rendering**: Reuse existing lightweight UI/tokens. Existing WebGL components are not evidence of an active operational 3D twin; no 3D activation or hidden theater restoration in this batch.
- **Competitor evidence**: Official-source research covers Palantir, Hexagon/Octave, Microsoft Sentinel, Genetec, Siemens, NVIDIA Omniverse, ServiceNow and SAP. Documentation, announcements, plan/version/GA limits and inference remain separate; the matrix is not a benchmark or IP opinion.
- **Quality targets**: The owner's ten target labels are desired directions, not achieved numeric scores. Evidence matrix records actual result/limit for each.
- **Method**: Used installed Spec Kit v1.3.1 `resolve-template.sh spec-template --json`, `setup-plan.sh --json`, and `setup-tasks.sh --json`; no claim of invoking a `specify` CLI/slash command. Hooks configuration is `{}`; no mandatory hook exists. Local ignored `.specify/feature.json` points to 003; actual Git branch was created by root, not these documentation scripts.

No new provider, DB mutation, seed, legal/biometric approval, operational tool execution, secret retrieval or external write is part of this discovery.
