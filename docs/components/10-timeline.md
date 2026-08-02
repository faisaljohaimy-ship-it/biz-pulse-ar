# 10 — Timeline · الخطوط الزمنية

**Time is evidence. Timelines render ordered history — runtime events, audits,
executions, decisions, agent activity — with one shared visual grammar.**

---

## Base spec (`NxTimeline`)

| Property | Value                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Axis     | vertical rail 2px white 10%, on the **right** (RTL — time flows down, details extend leftward)        |
| Node     | 12px dot on the rail: severity/status color + glyph for keyed events; plain 8px white 24% for routine |
| Entry    | node + time column (Label 12, absolute + relative tooltip) + content card zone (Body-compact)         |
| Grouping | day separators (Label 12 @ 56%, sticky while their day scrolls)                                       |
| Density  | Operations register; entry min-height 44                                                              |
| Order    | newest **top** by default (executive recency); chronological toggle for audit reading                 |
| Loading  | skeleton rail + 3 ghost entries; infinite scroll with "تحميل المزيد" fallback button                  |
| A11y     | `<ol>` semantics; entries focusable; time announced absolute; live-appended entries polite-announced  |

## The five timelines

| Component               | Purpose                                                                          | Overrides                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NxRuntimeTimeline**   | OS/module lifecycle events (boot, load, restart, recover)                        | runtime layer accent on keyed nodes; entry = event + module chip + state transition ("loaded ← registered" rendered RTL-aware as arrows toward the new state); boot sequences render as grouped block with stage list                                                    |
| **NxAuditTimeline**     | Tamper-evident trail rendering                                                   | node glyphs by category (قرار/توصية/اعتماد/وصول); entry shows actor + action + object + hash fragment (mono Latin, 8 chars, copy affordance); chain-verified badge in header (✓ سلسلة سليمة / ⚠ فحص متعذر); **no edit affordances anywhere** — read-only by construction |
| **NxExecutionTimeline** | A run's life: dispatch → policy → attempts → outcome                             | horizontal-in-entry mini-stages: policy ✓ → attempt chips (1,2…) → outcome chip; failures expand inline with error text (neutral styling, critical chip only on outcome); duration bar proportional (Label ms)                                                           |
| **NxDecisionTimeline**  | Decision lifecycle: drafted → evidence → recommended → gated → decided → outcome | mirrors the Executive Intelligence decision model stages; gate node rendered gold (the timeline's single gold); each stage links to its record (evidence drawer, approval record); pending gate = breathing gold node (2s, the only animated node)                       |
| **NxAgentTimeline**     | An agent's activity stream                                                       | agent presence ring as avatar per entry; entry = skill invoked + advisory output summary + confidence chip; mode glyph (advisory/supervised/gated) on every entry — what the agent was _allowed_ to do is part of history                                                |

## Timeline laws

1. Time never lies: entries render source timestamps; client clock skew note appears if
   detected ("توقيت الخادم").
2. Mixed-severity streams keep routine nodes visually quiet — a timeline where
   everything is colored says nothing.
3. Cross-linking: any entity chip in an entry deep-links to its record (Ch. 09 ≤ 2 click
   law from glance to raw).
4. Simulation events carry the badge per entry group, not per entry (noise control).
5. Mobile: time column collapses into the entry header line; rail persists (thinner,
   16px inset).
