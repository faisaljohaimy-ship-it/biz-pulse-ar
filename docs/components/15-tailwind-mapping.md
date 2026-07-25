# 15 — Tailwind Mapping · ربط Tailwind

**How the token system becomes utilities. NEXIOS uses Tailwind v4 CSS-first theming —
the existing `src/styles.css` `@theme`/token structure is the single mapping point.
This doc specifies the mapping; implementation lands in a later phase.**

---

## Theme variable mapping

Tokens (doc 14) register as Tailwind theme variables so utilities generate from them:

| Ladder | Theme namespace | Example utility |
|---|---|---|
| Colors (Ch. 03, existing `--color-*` bridge) | `--color-*` | `bg-card`, `text-primary`, `border-border` |
| Brand/status/layer (`--nx-cyan`…) | `--color-nx-*` aliases | `text-nx-cyan`, `border-nx-critical`, `border-nx-layer-shell` |
| Spacing | `--spacing-*` (4…96 ladder only) | `p-6`→24px per scale mapping, gap utilities |
| Radius | `--radius-*` (existing sm/md/lg/xl + 20/full) | `rounded-lg` = 16 |
| Shadows | `--shadow-e1…e4` | `shadow-e2` |
| Blur | `--blur-12/16/20/24` | `backdrop-blur-16` |
| Animation | `--animate-*` + keyframes (breathe, pulse-sector, shimmer, dot-wave) | `animate-breathe` |
| Z-index | `--z-*` ladder | `z-modal` |

Rule: theme variables point at `--nx-*` tokens (`--color-nx-cyan: var(--nx-cyan)`), never
duplicate raw values — one source, two spellings.

## Utility standards

1. **Utilities-first**: components style with utilities; bespoke CSS only for what
   utilities cannot express (complex keyframes, mask effects), named per
   NAMING-CONVENTION.
2. **Closed sets in class lists**: only utilities that resolve to ladder tokens.
   Arbitrary values (`p-[13px]`, `bg-[#123456]`) are lint-banned in `src/components/nx/`
   (enforcement lands with implementation phase — the rule is law now).
3. **Variant composition** via `class-variance-authority`-style maps (or equivalent):
   one `variants` object per component mirroring the spec's variant table — the spec
   table and the cva map must diff-match in review.
4. **State styling** through pseudo-variants (`hover:`, `focus-visible:`, `disabled:`,
   `aria-selected:`) — never JS class-toggling for CSS-expressible states.
5. Recipes for composites: glass = `bg-…/65 backdrop-blur-12 border border-white/8`
   packaged as a `@utility glass-e1…` set, not retyped per component.

## Responsive rules

- Breakpoints = Constitution Ch. 05/10 tiers: `sm:640 md:768 lg:1024 xl:1536 wall:2560`
  (custom `wall` screen registered; default Tailwind 2xl retired from use).
- Mobile-first utilities; register shifts (`density` prop) change token values via
  container class (`.register-boardroom` scopes semantic aliases), NOT via per-utility
  breakpoint forests.
- Logical properties only: `ms-*/me-*/ps-*/pe-*/start-*/end-*` — `ml/mr/pl/pr/left-/right-`
  are lint-banned in nx components (RTL law).

## Dark mode rules

NEXIOS is **dark-first and dark-only in v1**: the obsidian theme is the root theme, not
a `.dark` variant. Therefore:
- No `dark:` variants in nx components — they would imply a light default that doesn't
  exist.
- All tokens are defined at `:root`; a future light theme (if ever constitutionally
  amended) would re-map token VALUES, not touch component classes — this is why
  utilities must reference semantic tokens, never palette literals.
- OS-level `prefers-color-scheme` is acknowledged only in meta (`color-scheme: dark`)
  so form controls/scrollbars render dark natively.

## Migration & enforcement path (for later phases — not this one)

1. Register missing theme vars (shadows e-ladder, blur ladder, z ladder, animation
   tokens, layer colors) in `styles.css` beside the existing token block.
2. Add the `wall` screen + retire raw `2xl` usage in new components.
3. Lint rules: no-arbitrary-values, no-physical-direction, no-raw-hex in
   `src/components/nx/**`.
4. Each implemented component links its spec doc in a header comment; review diffs spec
   table ↔ cva map.

Until then, this mapping is the contract every future utility class answers to.
