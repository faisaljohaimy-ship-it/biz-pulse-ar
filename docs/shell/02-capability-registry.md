# 02 — Capability Registry · سجل القدرات

**Section 01 implementation — `PopulationCapabilityRegistry` +
`capabilityRecordSchema` (zod-strict, fail closed).**

---

## The capability model

A capability is a _grantable ability_ the Shell can later match skills
against. Its record carries fifteen mandated fields:

| Field                  | Type                                       | Notes                                                                                  |
| ---------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `id`                   | kebab id                                   | unique across the registry; collision with a skill id is a conflict                    |
| `name` / `description` | string                                     | human contract                                                                         |
| `category`             | registered category id                     | typo = validation refusal (doc 06)                                                     |
| `version`              | strict semver                              | governed by the version timeline (upgrade/rollback rules)                              |
| `owner`                | string                                     | accountable owner, never empty                                                         |
| `dependencies`         | `{target, necessity, binding}[]`           | see doc 05                                                                             |
| `permissions`          | 8-action enum[]                            | demanded vocabulary must be known to the model                                         |
| `executionMode`        | `advisory · supervised · autonomous-gated` | mirrors the frozen agent law                                                           |
| `health`               | 5-state enum                               | live status via `HealthModel` (worst-of aggregation)                                   |
| `lifecycle`            | 8-state enum                               | stored records always enter as `registered`                                            |
| `activationRules`      | closed rule enum[]                         | checked at `completeActivation`                                                        |
| `deactivationRules`    | closed rule enum[]                         | reserved for the deactivation phase                                                    |
| `visibility`           | `public · internal · restricted`           | discovery filter                                                                       |
| `metadata`             | structured block                           | doc 01 §Section 09: tags/keywords/sector/department/language/owner/dates/compatibility |

## Registry operations

- `register(record)` — via discovery engine only; emits `capability-added`.
- `transition(id, state)` — lifecycle machine enforced (doc 04).
- `reportHealth(id, status, note?)` — updates model + record.
- `requestActivation / approveActivation / completeActivation` — the
  human-gated protocol; approval demands the approver hold the `approval`
  permission on the subject (deny-by-default). `transition(id, "active")`
  is refused structurally — the protocol is the only road to `active`.
- `resume(id, approver)` — the governed `suspended → active` path: same
  approval permission, activation rules re-checked, completion journaled
  with the resume marker.
- `remove(id)` — only from `registered`/`suspended`/`archived`, and only
  when no dependents remain; emits `capability-removed`.
- Queries: `byCategory`, `byVisibility`, `byLifecycle`, `list`, `count`.

## Activation rule vocabulary (closed)

| Rule                  | Check at completion                                          |
| --------------------- | ------------------------------------------------------------ |
| `dependencies-active` | every **required** dependency's record is lifecycle `active` |
| `health-not-critical` | subject health is not `critical`/`offline`                   |
| `permissions-granted` | structural: the protocol itself demands an approval grant    |
| `manual-approval`     | structural: `approveActivation` is mandatory anyway          |

Unknown rule names cannot exist — the schema enum refuses them at admission.
