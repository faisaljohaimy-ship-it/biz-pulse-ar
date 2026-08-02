# 03 — Skill Registry · سجل المهارات

**Section 02 implementation — `PopulationSkillRegistry` + `skillRecordSchema`.
A skill record WRAPS the frozen Phase-1 `SkillManifest` — composition, never
modification.**

---

## The skill record

| Field                  | Type                               | Notes                                                   |
| ---------------------- | ---------------------------------- | ------------------------------------------------------- |
| `id`                   | kebab id                           | must equal `manifest.id` (identity law)                 |
| `manifest`             | Phase-1 `SkillManifest`            | validated by the frozen schema, embedded verbatim       |
| `version`              | strict semver                      | must equal `manifest.version`; timeline-governed        |
| `category`             | registered category id             |                                                         |
| `requiredCapabilities` | id[]                               | every reference must resolve in the capability registry |
| `dependencies`         | `{target, necessity, binding}[]`   | doc 05 semantics                                        |
| `executionContract`    | see below                          | how the runtime may invoke it later                     |
| `permissions`          | 8-action enum[]                    | known vocabulary only                                   |
| `policies`             | `{id, description, enforcement}[]` | `blocking` or `advisory`                                |
| `health` / `lifecycle` | enums                              | same governance as capabilities                         |
| `metadata`             | structured block                   | Section 09 fields                                       |

## Execution contract

```ts
{ invocation: "synchronous" | "streamed" | "queued",
  timeoutMs: number,          // ceiling 300000 — enforced
  retryable: boolean,
  idempotent: boolean }       // retryable ⇒ idempotent (law)
```

The `retryable ⇒ idempotent` implication is validated: a retryable,
non-idempotent contract is refused — the Shell will never license a retry
that could double-execute.

## Skill-specific admission checks (on top of doc 06)

1. record id = manifest id; record version = manifest version.
2. Every `requiredCapabilities` entry resolves in the capability registry.
3. When the compatibility matrix declares a minimum for a required
   capability, the registered capability's version must satisfy it
   (`isCompatible`: same major, no downgrade).

## Operations

`register` (discovery-engine only, emits `skill-registered`) ·
`update(id, {policies?, metadata?})` (identity/version immutable, emits
`skill-updated`) · lifecycle/health/activation protocol identical to doc 02 —
skill activation always enforces `dependencies-active` + `health-not-critical` ·
queries `byCategory`, `requiringCapability`, `byLifecycle`.
