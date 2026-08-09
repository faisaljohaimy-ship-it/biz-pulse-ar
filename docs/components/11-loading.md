# 11 — Loading System · نظام الانتظار

**Waiting is a designed state. The OS never shows a lying spinner: loading is shaped
like the truth it precedes (skeleton), measured when measurable (progress), and honest
about thinking (SADEED). عقيدة «بيانات لا تفرغ» applies: ≤ 4s to content or fallback.**

---

## Selection law

| Situation                             | Component                                      |
| ------------------------------------- | ---------------------------------------------- |
| Content with known shape incoming     | **Skeleton** (always preferred)                |
| Sub-second inline operation           | **Spinner** (16/20px inline)                   |
| Measurable long operation             | **Progress** (bar/ring, determinate)           |
| Unmeasurable long operation           | Progress indeterminate + elapsed time + cancel |
| SADEED reasoning                      | **SADEED Thinking**                            |
| Domain zones (runtime/knowledge/twin) | flavored skeletons below                       |

Full-screen spinners are banned. Blocking overlays for loading are banned (except inside
the triggering button/modal footer).

## The seven components

| Component              | Spec                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NxSkeleton**         | Bars/blocks on the 8pt rhythm mirroring target anatomy (title bar 24, text bars 16, number block 48…); fill white 6%, shimmer sweep white 4% 2s linear loop (RTL sweep: right→left); radius matches target; reduced-motion: static 8% fill; max lifetime 4s → falls back to designed empty/fallback content (doctrine) |
| **NxSpinner**          | 16/20/24px stroke ring, 1.5–2px, cyan @ 72%, 900ms rotation; inline only (buttons, chips, table cells); always beside an Arabic verb ("يحمّل…") when ≥ 20px                                                                                                                                                            |
| **NxProgress**         | Bar 4px (radius 2) or Ring (doc 05 geometry); determinate: fill cyan, % Label trailing; indeterminate: 30% segment sweeping 1.5s; long ops add elapsed + step line ("٣/٥ فحص التبعيات"); cancel affordance where the op is cancelable                                                                                  |
| **NxRuntimeLoading**   | Boot/module operations: staged checklist rows (stage name + pending/active spinner 16/done ✓) mirroring the real boot stages; runtime accent; used in runtime modals/panels                                                                                                                                            |
| **NxSadeedThinking**   | SADEED's reasoning state: presence ring slow-breathes + three-dot wave (staggered 200ms) + rotating status line from a fixed honest set ("أراجع الدليل…", "أرتب التوصية…"); NEVER fake streams text; voice mode: subtle waveform idle; timeout → honest fallback line with retry (guaranteed-reply doctrine)           |
| **NxKnowledgeLoading** | Document zones: page-shaped skeleton (title bar + measure-width text bars) + source chip placeholder; freshness slot shimmer                                                                                                                                                                                           |
| **NxTwinLoading**      | Twin viewport: silhouette placeholder of the asset class (station/network outline at white 8%) + telemetry strip skeleton; sector pulse absent while loading (pulse = live data only — a loading pulse would lie)                                                                                                      |

## Laws

1. Skeleton-to-content swap is layout-stable: identical box, no jump, 150ms crossfade.
2. Nested loading collapses upward: a panel shows ONE skeleton, not per-card spinners.
3. Every loader ≥ 2s shows what's happening in Arabic; every loader ≥ 4s must resolve,
   fall back, or expose retry — infinite anything is a constitutional defect.
4. Loading never blocks reading of already-loaded content (progressive hydration).
5. Perceived-speed order: skeleton > optimistic content > spinner. Choose accordingly.
