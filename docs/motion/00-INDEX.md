# SADEED Motion & Cinematic System — نظام الحركة السينمائي

**Version 1.0 · Status: RATIFIED · Parent law: [Design Constitution](../design/00-INDEX.md) · Sibling law: [Component Library](../components/00-INDEX.md)**

---

## What this is

The official motion language of SADEED: how the OS moves, breathes and responds. Motion
here is a _communication channel_ — every animation reports system state, guides
attention, or confirms an action. Decoration-only motion does not exist in SADEED.

This phase is **specification only**: no implementation, no page changes, no
architecture changes. It deepens the motion budget already ratified (Component Standards
§3, Constitution Ch. 01 §6 / Ch. 06) — where earlier law set caps, this system fills in
the choreography beneath them. Any apparent conflict resolves in favor of the earlier
constitutional caps.

## Document map

| Doc                                                     | Covers                                                      | Prompt sections      |
| ------------------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| [01 Motion Constitution](./01-motion-constitution.md)   | Principles, hierarchy, accessibility                        | 01                   |
| [02 Timing Standards](./02-timing-standards.md)         | Duration classes, easing, latency budgets                   | 02                   |
| [03 Animation Tokens](./03-animation-tokens.md)         | Tokens, springs, keyframe vocabulary                        | 15 (tokens)          |
| [04 Interface Motion](./04-interface-motion.md)         | Pages, panels, KPI, stream, notifications, micro, loading   | 03 04 08 09 10 11 12 |
| [05 Signature Motion](./05-signature-motion.md)         | SADEED, runtime pipeline, digital twin, holographic effects | 05 06 07 13          |
| [06 Implementation Guide](./06-implementation-guide.md) | Framer Motion / CSS patterns, GPU rules, performance        | 14 15                |
| [07 Quality Checklist](./07-quality-checklist.md)       | The ship gate for any motion                                | QA                   |

## The one-sentence law

> **الحركة معنى** — Motion is meaning. If freezing an animation loses no information,
> the animation should not exist.

## Standing caps (inherited, restated for convenience)

Micro 100–150ms · transitions 200–300ms · exits faster than entrances · live loops ≥ 2s
cycle, opacity/glow only · no overshoot or bounce anywhere · `prefers-reduced-motion`
yields full information parity · nothing animates without a state change behind it.
