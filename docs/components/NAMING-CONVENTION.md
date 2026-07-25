# Naming Convention — اصطلاح التسمية

**Names are API. One grammar for components, props, files, tokens and CSS.**

---

## Component names

- Prefix **`Nx`** + PascalCase noun: `NxButton`, `NxKpiNumber`, `NxFinnCard`,
  `NxApprovalModal`. The prefix marks "official library" — an un-prefixed component in a
  screen is by definition unofficial and a finding.
- Category is implicit in the noun, never doubled: `NxTableAudit` ❌ → `NxAuditTable` ✅.
- Domain-flavored components carry the domain first: `NxFinnCard`, `NxTwinPanel`,
  `NxShellMenu` — domain prefixes are the closed set: `Finn`, `Runtime`, `Shell`,
  `Knowledge`, `Twin`, `Agent`, `Exec`.

## Variant & prop grammar

- One `variant` prop per component, values kebab-case from the spec's closed set:
  `variant="ghost" | "glass" | "danger"…`
- One `size` prop: `sm | md | lg | xl` (mapped per component to token values — never
  arbitrary numbers).
- One `density` prop where registers apply: `boardroom | command | operations`
  (Constitution Ch. 02).
- State is **never** a prop when it can be derived (`loading`, `disabled`, `selected`
  are props; `hover`, `focus`, `pressed` are never).
- Booleans are positive: `disabled` ✅ `notEnabled` ❌; `open` ✅ `isNotClosed` ❌.
- Event props: `onApprove`, `onDismiss` — verb-first, no `handle*` in the public API.

## File & directory convention

```
src/components/nx/
  buttons/nx-button.tsx          → NxButton (all variants, one file)
  cards/nx-finn-card.tsx
  tables/nx-audit-table.tsx
  …one directory per library doc 01–13
```
- File names kebab-case mirroring the component name.
- One exported component per file plus its prop types; variants live inside, never as
  separate files (variant explosion is how libraries die).
- Stories/tests sit beside: `nx-button.test.tsx`.

## Token names

- CSS custom properties: `--nx-<ladder>-<step>`: `--nx-space-24`, `--nx-radius-16`,
  `--nx-shadow-e2`, `--nx-glow-focus`, `--nx-anim-fast`, `--nx-opacity-72`,
  `--nx-blur-12`, `--nx-elev-3`.
- Existing brand tokens (`--nx-cyan`, `--nx-obsidian`…) are grandfathered as the color
  ladder — never renamed.
- Semantic aliases point at ladder steps, never at raw values:
  `--nx-panel-padding: var(--nx-space-24)`.

## CSS / Tailwind class grammar

- Utilities first (doc 15); bespoke classes only for what utilities cannot express, named
  `nx-<component>[__<part>][--<state>]`: `nx-voice-button__ring--listening`.
- No global element selectors, no `!important`, no inline hex/px.

## Arabic naming

Every component spec carries its Arabic name (e.g., `NxApprovalModal` — نافذة الاعتماد).
Arabic names are the vocabulary of design discussion and documentation; code identifiers
stay Latin for toolchain safety.
