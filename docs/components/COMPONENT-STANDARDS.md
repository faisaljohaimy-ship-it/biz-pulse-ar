# Component Standards — عقد المكوّن

**The contract every NxComponent signs before it exists. Specs in docs 01–13 assume this
contract; they list only what differs.**

---

## 1 · The spec skeleton

Every component is specified with: **Purpose** (one sentence — which decision/interaction
it serves) · **Anatomy** (named parts) · **Spec table** (all values as token references) ·
**States matrix** · **Motion** · **Accessibility** · **RTL note**. An implementation PR
links the spec and satisfies every row.

## 2 · The universal states matrix

Unless a spec overrides, every interactive component implements exactly these states:

| State            | Universal treatment                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Rest             | spec colors, elevation per spec                                                           |
| Hover            | +1 border-opacity step, 6% wash, elevation +1 where spec'd — **150ms ease-out, no scale** |
| Pressed          | wash 8%, translate-y 1px, 100ms                                                           |
| Focus (keyboard) | 2px `--nx-cyan` ring, offset 2px, never removed                                           |
| Disabled         | content `--nx-opacity-38`, no hover/press, `aria-disabled`                                |
| Loading          | skeleton or inline spinner per doc 11 — content never jumps on resolve                    |
| Error            | `--nx-critical` border @ 40% + message slot — color never alone (glyph/word)              |

Non-interactive components implement Rest / Loading / Empty / Error only.

## 3 · Motion budget

- Micro (hover, press, focus): 100–150ms, `ease-out`.
- Transition (open, close, expand): 200–300ms, `ease-out`; exit 150ms.
- Live loops (presence, pulse): ≥ 2s cycle, opacity/glow only — never position.
- `prefers-reduced-motion`: loops freeze, transitions drop to 1ms, information parity
  guaranteed.
- Nothing animates without a state change behind it (Constitution Ch. 01 §6).

## 4 · Accessibility floor (WCAG 2.1)

- Text AAA (≥ 7:1), labels AA (≥ 4.5:1) per Constitution Ch. 03 pairs.
- Full keyboard path: tab order = RTL reading order; Escape closes overlays; Enter/Space
  activate; arrow keys navigate composite widgets (tables, menus, tabs).
- Every control has an accessible Arabic name; icons alone never label (Ch. 07).
- Touch targets ≥ 44×44px on touch tiers.
- Live regions: notifications/toasts announce via `aria-live="polite"`, critical via
  `assertive`; FINN speech surfaces mirror text for screen readers.
- Semantics first: native elements over FINN re-implementation, always.

## 5 · RTL / LTR

- RTL is the layout truth: logical properties only, leading = right, trailing = left.
- Directional iconography mirrors per Ch. 07; numbers/identifiers embed with `<bdi>`.
- Every component renders correctly with `dir="rtl"` root **and** inside an LTR
  embedding without a variant fork.

## 6 · Responsiveness

Components declare behavior per tier (Ch. 10): what collapses, what stacks, what hides
into disclosure. "It shrinks" is not a behavior. Minimum verified viewports: 390×844,
1280×800 (+2560×1440 for boardroom-eligible components).

## 7 · Data honesty

Components that display data must render all four truths: value + unit + time reference +
source class (live / `is_simulation` badge). Loading is skeleton (shaped like the truth),
empty is designed (doc 12), failure is neutral Arabic + retry (doc 13). Infinite spinners
are constitutionally banned.

## 8 · Composition & API discipline

- Props ≤ 12 per component; more means the component is two components.
- Slots (children/named slots) over configuration objects.
- No component reaches into another's internals; communication is props/events.
- No component fetches data; screens own data, components own presentation (keeps every
  component reusable across live/simulation/showcase sources).

## 9 · Performance

- Glass/blur within Ch. 06 caps; at most one `backdrop-blur` layer per component.
- Lists > 50 rows virtualize; images lazy; loops pause off-viewport.
- The global performance budget (`check-performance-budget.mjs`) is the final referee —
  a component that breaks it does not ship, whatever it looks like.
