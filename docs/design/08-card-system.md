# Chapter 08 — Card System

**The eight canonical cards. Every card in SADEED is one of these or a constitutional
amendment.**

---

## Shared anatomy (all cards)

All cards inherit the panel anatomy (Chapter 02), the elevation physics (Chapter 06) and
these base values — per-card rows below override only what they name:

| Property        | Base value                                                                         |
| --------------- | ---------------------------------------------------------------------------------- |
| Padding         | 24px (Command) / 32px (Boardroom) / 16px (Operations)                              |
| Corner radius   | 16px (`--radius`); nested elements 12px; chips 8px                                 |
| Elevation       | E1 rest → E2 hover/active                                                          |
| Border          | 1px white @ 8%                                                                     |
| Glass           | surface @ 65%, blur 12px                                                           |
| Shadow          | per elevation table (Ch. 06)                                                       |
| Hover           | elevate to E2, border → 10%, 150ms ease-out; **no scale, no lift-translate > 2px** |
| Active/selected | border → context accent @ 40%, 2px inset indicator on the right edge (RTL)         |
| Focus           | 2px cyan ring                                                                      |
| Loading         | skeleton bars on 8pt rhythm, shimmer ≥ 2s                                          |
| Empty / error   | designed empty state; neutral Arabic message + retry (never bare)                  |

## 1 · Executive Card — البطاقة التنفيذية

The decision unit. Hero KPI or verdict + one-line insight + provenance footer.

| Property | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Radius   | 20px (largest in system — signals rank)                               |
| Glow     | context accent @ 25% only while it is the screen hero                 |
| Content  | Display number (Ch. 04) + delta chip + one Body line max              |
| States   | hover E2; **no click ambiguity** — whole card is one action or none   |
| Gold     | permitted here only, for approval-pending state (single element rule) |

## 2 · Analytics Card — بطاقة التحليلات

Chart container. Header + chart zone + provenance.

| Property      | Value                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Border        | layer-analytics @ 24% top border accent (2px)                                     |
| Chart padding | 16px inner; axes labels 12/16 Label                                               |
| Glow          | never (charts glow = false signal)                                                |
| Hover         | E2 + crosshair/tooltip only; tooltip at E3                                        |
| Density       | one chart per card; comparisons = small-multiple cards, never dual-axis spaghetti |

## 3 · Runtime Card — بطاقة التشغيل

Module/system health from the OS runtime.

| Property | Value                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| Border   | layer-runtime @ 24%                                                                                          |
| Content  | module glyph (icon-32) + state chip + 2 micro-metrics                                                        |
| States   | healthy = calm; degraded = warning chip; failed = critical ring (Ch. 06) — the **card body never turns red** |
| Hover    | E2 + reveal last-event line                                                                                  |

## 4 · SADEED Card — بطاقة SADEED

SADEED's voice in card form: insight, answer, or recommendation.

| Property               | Value                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| Border                 | layer-agent @ 24% + presence ring on the avatar                                                                |
| Glass                  | card @ 72% (slightly denser — speech deserves solidity)                                                        |
| Content                | agent header (avatar+mode glyph, Ch. 07) + Arabic body ≤ 3 lines + evidence row (confidence %, sources count)  |
| Recommendation variant | appends the approval gate: solid footer strip, gold accent, explicit approve/decline — **never auto-anything** |
| Simulation             | `is_simulation` badge top-left (RTL trailing) when applicable                                                  |

## 5 · Knowledge Card — بطاقة المعرفة

Documents, references, knowledge-pack entries.

| Property | Value                                                                         |
| -------- | ----------------------------------------------------------------------------- |
| Border   | layer-knowledge @ 24%                                                         |
| Content  | doc glyph + title (H3) + source + freshness label                             |
| Hover    | E2 + preview affordance (opens drawer at E3; never inline expansion in grids) |

## 6 · Adaptive Shell Card — بطاقة الصدفة التكيفية

Skills, agents, tools, capabilities, NDK packages.

| Property | Value                                                                                        |
| -------- | -------------------------------------------------------------------------------------------- |
| Border   | layer-shell (violet) @ 24% — the only violet-marked card                                     |
| Content  | kind chip (skill/agent/tool/capability) + id (Latin, mono-ish Label) + version chip + status |
| States   | draft = dashed border; disabled = 38% content opacity; active = violet inset indicator       |
| Hover    | E2 + dependency count reveal                                                                 |

## 7 · Digital Twin Card — بطاقة التوأم الرقمي

Physical-asset mirrors: stations, networks, sites.

| Property | Value                                                                            |
| -------- | -------------------------------------------------------------------------------- |
| Border   | layer-twin @ 24%                                                                 |
| Content  | mini-viz zone (map/asset silhouette, may use sector pulse glow) + telemetry trio |
| Glow     | sector pulse permitted inside viz zone only                                      |
| Hover    | E2 + telemetry timestamps                                                        |

## 8 · Notification Card — بطاقة الإشعار

Events, alerts, approvals feed.

| Property  | Value                                                                                     |
| --------- | ----------------------------------------------------------------------------------------- |
| Padding   | 16px (compact by design)                                                                  |
| Radius    | 12px                                                                                      |
| Elevation | E1 flat; **toast variant** at E5 near-solid                                               |
| Severity  | 3px right-edge bar (RTL) in status color + status glyph + Arabic word — triple redundancy |
| States    | unread = 100% text + dot; read = 72% text; critical = one-time 2-pulse ring then static   |
| Actions   | max two, text buttons, footer row                                                         |

## Composition laws

1. One card class per grid section — mixing Runtime cards inside an Analytics grid breaks
   scanability.
2. Cards never nest cards. A card needing a card inside is a drawer trigger.
3. Grid gaps between cards: 24px (16px mobile), from Chapter 05 — never "tight" variants.
4. New card need → check the eight; if genuinely none fits, amend this chapter _before_
   building (Index: amendment process). The eight are slots for the future, not a museum.
