# SADEED Component Library — فهرس المكوّنات الرسمي

**Version 1.0 · Status: RATIFIED · Parent law: [`/docs/design/`](../design/00-INDEX.md) (Design Constitution v1.0)**

---

## What this is

The official SADEED Enterprise Component Library. Every screen in the system — current
and future — is composed **only** from components specified here. One visual language,
one operating system. This library _instantiates_ the Design Constitution: where the
Constitution defines law (colors, depth, grid, type), this library defines the parts
that obey it. Nothing here overrides the Constitution; a conflict is a defect in this
library.

**This phase is specification only.** No implementation, no page changes, no
architecture changes. Implementation happens in later phases, component by component,
against these specs.

## Library map

| Doc                                             | Category         | Components                         |
| ----------------------------------------------- | ---------------- | ---------------------------------- |
| [NAMING-CONVENTION](./NAMING-CONVENTION.md)     | Naming           | prefixes, props, files, tokens     |
| [COMPONENT-STANDARDS](./COMPONENT-STANDARDS.md) | Standards        | the contract every component signs |
| [01](./01-buttons.md)                           | Button System    | 16 buttons                         |
| [02](./02-inputs.md)                            | Input System     | 14 inputs                          |
| [03](./03-cards.md)                             | Card Library     | 13 cards                           |
| [04](./04-tables.md)                            | Table System     | 7 tables + behaviors               |
| [05](./05-kpi.md)                               | KPI Components   | 10 indicators                      |
| [06](./06-navigation.md)                        | Navigation       | 8 navigators                       |
| [07](./07-panels.md)                            | Panels           | 9 panels                           |
| [08](./08-modals.md)                            | Modals           | 7 overlays                         |
| [09](./09-notifications.md)                     | Notifications    | 8 messengers                       |
| [10](./10-timeline.md)                          | Timeline         | 5 timelines                        |
| [11](./11-loading.md)                           | Loading System   | 7 waiting states                   |
| [12](./12-empty-states.md)                      | Empty States     | premium emptiness                  |
| [13](./13-error-states.md)                      | Error States     | 8 failure surfaces                 |
| [14](./14-tokens.md)                            | Component Tokens | the 9 token ladders                |
| [15](./15-tailwind-mapping.md)                  | Tailwind Mapping | theme, utilities, dark/RTL rules   |

## How specs are written

Every component spec has the same skeleton — **Purpose · Anatomy · Spec table
(padding/radius/type/colors by token) · States matrix · Motion · Accessibility · RTL
note** — so a builder can implement any component without a meeting. Categories define a
**base spec** first; variants list only their overrides (the same inheritance pattern the
Constitution's card chapter established).

## Composition rules (library-wide)

1. Screens compose panels; panels compose cards/tables/KPIs; those compose primitives
   (buttons, inputs, indicators). Skipping a layer (a raw button floating on canvas) is
   a review finding.
2. A needed component that isn't specified here gets **specified first** (amendment via
   the Constitution's process), then built. No one-off components, ever.
3. Variants are closed sets. "Custom" is not a variant.
4. All values in these specs are **token references** (doc 14). A raw px/hex in an
   implementation PR is a finding.

## Quality gate (applies to every component)

Reusable (no page-specific logic) · Scalable (density registers, not forks) · Responsive
(390 → 4K contracts) · Accessible (WCAG 2.1 AA minimum, AAA text) · Animated within the
motion budget · RTL-native with LTR embedding · One-OS feel (passes the "does it look
like SADEED?" review question with no context given).
