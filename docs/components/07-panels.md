# 07 — Panels · الألواح

**The panel is the atomic composition unit (Constitution Ch. 02): header + one-idea
content + provenance footer. These nine specialize it; all inherit the panel anatomy,
glass E1, and density registers.**

---

## Base spec (`NxPanel`)

Header 48px (H3 title ≤ 3 words + status/action slot) · content zone (one idea) ·
optional footer 40px (provenance + link) · padding by register 24/32/16 · radius 16 ·
glass surface 65% blur 12 · border white 8% · loading = skeleton of its own anatomy ·
empty/error per docs 12–13.

## The nine panels

| Component              | Purpose                          | Overrides & content grammar                                                                                                                                                                                        |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NxExecutivePanel**   | Hosts the screen's hero tier     | Boardroom padding 32; may hold ExecutiveKpi or ExecutiveCard grid ≤ 3; the only panel eligible for glow (as hero); title Executive-Title when it IS the screen head                                                |
| **NxAnalyticsPanel**   | Chart group container            | analytics top-border 2px @ 24%; hosts AnalyticsCards or one large chart; legend row standardized under header; comparison = small multiples inside, never dual-axis                                                |
| **NxRuntimePanel**     | OS/module health zone            | runtime border; hosts RuntimeCards grid or RuntimeTable; header status chip aggregates ("٤/٤ سليم")                                                                                                                |
| **NxFinnPanel**        | FINN's living region on a screen | agent border + presence ring in header; hosts FinnCards, voice affordance (Voice Button) and thinking state (doc 11); position: consistent per layout template — FINN appears where executives learned to find him |
| **NxKnowledgePanel**   | Documents/refs zone              | knowledge border; KnowledgeCards list + SearchInput; freshness sort default                                                                                                                                        |
| **NxAgentPanel**       | Specialist agents roster         | agent border; agent rows: presence ring avatar + mode glyph + supported-skills count; advisory-only affordances (Ch. 07 mode glyph law visible per agent)                                                          |
| **NxShellPanel**       | Adaptive Shell population view   | violet border; kind filter chips + ShellCards grid; NDK provenance row (package version) in footer                                                                                                                 |
| **NxTwinPanel**        | Digital twin viewport            | twin border; viz zone may run sector pulse + holographic depth within Ch. 06 §holographic caps; telemetry strip below viz; fullscreen affordance → doc 08 Fullscreen                                               |
| **NxEventStreamPanel** | Live executive events            | hosts NotificationCards feed or TimelineTable; newest at top with 200ms entrance; auto-scroll pauses on hover/interaction ("متابعة مباشرة" resume chip); severity filter chips                                     |

## Panel laws

1. One idea per panel; a second header means a second panel (Ch. 02).
2. Layer-bordered panels (runtime/agent/shell/knowledge/twin/analytics) are how a screen
   telegraphs its architecture — the border colors are fixed (Ch. 03 §5) and never mix
   on one panel.
3. Panels tile on the grid (Ch. 05); panel-in-panel max depth 1 (a panel may host cards,
   not panels — except declared workspace splits).
4. Every data panel's footer carries the four truths; EventStream shows connection state
   (مباشر / محاكاة / منقطع + retry).
5. Panel headers are draggable-zone eligible in future workspace features; content is
   not — specify handles in header only.

## Responsive

Panels are grid citizens: desktop N-column → tablet 2 → mobile 1 (stack in RTL reading
order, Ch. 10). EventStream and FinnPanel collapse to summary bars on mobile with
expansion; TwinPanel viz reduces to static snapshot below tablet (holographic budget).
