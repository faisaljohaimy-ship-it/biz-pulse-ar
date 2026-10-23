# Design Tokens

Token reference for **AI Command Center**. Use utility classes and CSS variables — never raw values.

## Colors

Apply with any color utility: `bg-<name>`, `text-<name>`, `border-<name>`, `ring-<name>`, `divide-<name>`, etc.

| Name                         | CSS variable                   |
| ---------------------------- | ------------------------------ |
| `COLORS.bg`                  | `COLORS.bg`                    |
| `COLORS.river`               | `COLORS.river`                 |
| `COLORS.riverGlow`           | `COLORS.riverGlow`             |
| `COLORS.riverHead`           | `COLORS.riverHead`             |
| `COLORS.riverHeadGlow`       | `COLORS.riverHeadGlow`         |
| `COLORS.border`              | `COLORS.border`                |
| `COLORS.cream`               | `COLORS.cream`                 |
| `COUNTRY.china`              | `COUNTRY.china`                |
| `COUNTRY.india`              | `COUNTRY.india`                |
| `COUNTRY.bangladesh`         | `COUNTRY.bangladesh`           |
| `COUNTRY_DARK.china`         | `COUNTRY_DARK.china`           |
| `COUNTRY_DARK.india`         | `COUNTRY_DARK.india`           |
| `COUNTRY_DARK.bangladesh`    | `COUNTRY_DARK.bangladesh`      |
| `nx-bg-1`                    | `--nx-bg-1`                    |
| `nx-bg-2`                    | `--nx-bg-2`                    |
| `nx-surface`                 | `--nx-surface`                 |
| `nx-card`                    | `--nx-card`                    |
| `nx-cyan`                    | `--nx-cyan`                    |
| `nx-cyan-2`                  | `--nx-cyan-2`                  |
| `nx-cyan-3`                  | `--nx-cyan-3`                  |
| `nx-exec`                    | `--nx-exec`                    |
| `nx-success`                 | `--nx-success`                 |
| `nx-warning`                 | `--nx-warning`                 |
| `nx-critical`                | `--nx-critical`                |
| `nx-info`                    | `--nx-info`                    |
| `nx-obsidian`                | `--nx-obsidian`                |
| `nx-ink`                     | `--nx-ink`                     |
| `nx-navy`                    | `--nx-navy`                    |
| `nx-pearl`                   | `--nx-pearl`                   |
| `nx-gold`                    | `--nx-gold`                    |
| `nx-white`                   | `--nx-white`                   |
| `card`                       | `--card`                       |
| `popover`                    | `--popover`                    |
| `primary-foreground`         | `--primary-foreground`         |
| `muted`                      | `--muted`                      |
| `accent-foreground`          | `--accent-foreground`          |
| `destructive-foreground`     | `--destructive-foreground`     |
| `success-foreground`         | `--success-foreground`         |
| `border`                     | `--border`                     |
| `sidebar-primary-foreground` | `--sidebar-primary-foreground` |
| `sidebar-accent`             | `--sidebar-accent`             |
| `sidebar-border`             | `--sidebar-border`             |
| `gradient-primary`           | `--gradient-primary`           |
| `background`                 | `--background`                 |
| `foreground`                 | `--foreground`                 |
| `card-foreground`            | `--card-foreground`            |
| `popover-foreground`         | `--popover-foreground`         |
| `primary`                    | `--primary`                    |
| `secondary`                  | `--secondary`                  |
| `secondary-foreground`       | `--secondary-foreground`       |
| `muted-foreground`           | `--muted-foreground`           |
| `accent`                     | `--accent`                     |
| `ring`                       | `--ring`                       |
| `sidebar-foreground`         | `--sidebar-foreground`         |
| `sidebar-accent-foreground`  | `--sidebar-accent-foreground`  |
| `surface`                    | `--surface`                    |
| `surface-2`                  | `--surface-2`                  |
| `ink`                        | `--ink`                        |
| `ink-2`                      | `--ink-2`                      |
| `ink-3`                      | `--ink-3`                      |
| `chip`                       | `--chip`                       |
| `chip-strong`                | `--chip-strong`                |
| `chip-hover`                 | `--chip-hover`                 |
| `hairline`                   | `--hairline`                   |
| `hairline-soft`              | `--hairline-soft`              |
| `hairline-hover`             | `--hairline-hover`             |
| `tone-cyan`                  | `--tone-cyan`                  |
| `tone-emerald`               | `--tone-emerald`               |
| `tone-rose`                  | `--tone-rose`                  |
| `tone-amber`                 | `--tone-amber`                 |
| `tone-blue`                  | `--tone-blue`                  |
| `tone-violet`                | `--tone-violet`                |
| `stage-paper`                | `--stage-paper`                |
| `stage-paper-2`              | `--stage-paper-2`              |
| `stage-ink`                  | `--stage-ink`                  |
| `stage-ink-2`                | `--stage-ink-2`                |
| `stage-cyan`                 | `--stage-cyan`                 |
| `stage-blue`                 | `--stage-blue`                 |
| `stage-violet`               | `--stage-violet`               |
| `stage-emerald`              | `--stage-emerald`              |
| `stage-amber`                | `--stage-amber`                |
| `stage-rose`                 | `--stage-rose`                 |
| `holo-accent`                | `--holo-accent`                |
| `holo-border`                | `--holo-border`                |
| `sd-royal`                   | `--sd-royal`                   |
| `sd-azure`                   | `--sd-azure`                   |
| `sd-azure-soft`              | `--sd-azure-soft`              |
| `sd-cyan`                    | `--sd-cyan`                    |
| `sd-emerald`                 | `--sd-emerald`                 |
| `sd-amber`                   | `--sd-amber`                   |
| `sd-ruby`                    | `--sd-ruby`                    |
| `sd-white`                   | `--sd-white`                   |
| `sd-pearl`                   | `--sd-pearl`                   |
| `sd-ink`                     | `--sd-ink`                     |
| `sd-ink-2`                   | `--sd-ink-2`                   |
| `sd-glass`                   | `--sd-glass`                   |
| `sd-glass-strong`            | `--sd-glass-strong`            |
| `sd-arch-edge`               | `--sd-arch-edge`               |
| `sd-holo-1`                  | `--sd-holo-1`                  |
| `sd-holo-2`                  | `--sd-holo-2`                  |
| `sd-holo-edge`               | `--sd-holo-edge`               |
| `sd-holo-edge-soft`          | `--sd-holo-edge-soft`          |
| `pv-daylight`                | `--pv-daylight`                |
| `pv-sky`                     | `--pv-sky`                     |
| `pv-edge`                    | `--pv-edge`                    |
| `pv-edge-soft`               | `--pv-edge-soft`               |
| `sec-wire`                   | `--sec-wire`                   |
| `sec-pylon`                  | `--sec-pylon`                  |
| `sec-mesh`                   | `--sec-mesh`                   |
| `sec-arc`                    | `--sec-arc`                    |
| `sidebar-ring`               | `--sidebar-ring`               |
| `glass-fill`                 | `--glass-fill`                 |
| `glass-rim`                  | `--glass-rim`                  |
| `glass-shade`                | `--glass-shade`                |
| `glass-edge`                 | `--glass-edge`                 |
| `arabia-accent`              | `--arabia-accent`              |
| `arabia-accent-2`            | `--arabia-accent-2`            |
| `arabia-chip-bg`             | `--arabia-chip-bg`             |
| `arabia-tab-active`          | `--arabia-tab-active`          |
| `arabia-sea`                 | `--arabia-sea`                 |
| `arabia-land`                | `--arabia-land`                |
| `arabia-land-edge`           | `--arabia-land-edge`           |
| `arabia-border`              | `--arabia-border`              |
| `live`                       | `--live`                       |
| `card-fill`                  | `--card-fill`                  |
| `sv-gold`                    | `--sv-gold`                    |
| `orb`                        | `--orb`                        |
| `white`                      | `--color-white`                |
| `twin-sky-1`                 | `--twin-sky-1`                 |
| `twin-sky-2`                 | `--twin-sky-2`                 |
| `twin-sky-3`                 | `--twin-sky-3`                 |
| `twin-sun`                   | `--twin-sun`                   |
| `twin-ridge`                 | `--twin-ridge`                 |
| `twin-haze`                  | `--twin-haze`                  |
| `twin-ground-0`              | `--twin-ground-0`              |
| `twin-ground-1`              | `--twin-ground-1`              |
| `twin-ground-2`              | `--twin-ground-2`              |
| `twin-water-1`               | `--twin-water-1`               |
| `twin-water-2`               | `--twin-water-2`               |
| `twin-face-lit`              | `--twin-face-lit`              |
| `twin-face-roof`             | `--twin-face-roof`             |
| `twin-rim`                   | `--twin-rim`                   |
| `twin-lattice`               | `--twin-lattice`               |
| `twin-window`                | `--twin-window`                |
| `twin-contact`               | `--twin-contact`               |
| `twin-pin-halo`              | `--twin-pin-halo`              |
| `sd-holo`                    | `--sd-holo`                    |
| `ana-muted`                  | `--ana-muted`                  |
| `brand-ring`                 | `--brand-ring`                 |
| `card-sky-mix`               | `--card-sky-mix`               |
| `card-sky-low`               | `--card-sky-low`               |
| `card-sky-high`              | `--card-sky-high`              |
| `ops-muted`                  | `--ops-muted`                  |
| `sdc-card`                   | `--sdc-card`                   |
| `sdc-card-top`               | `--sdc-card-top`               |
| `nx-layer-runtime`           | `--nx-layer-runtime`           |
| `nx-layer-shell`             | `--nx-layer-shell`             |
| `nx-layer-agent`             | `--nx-layer-agent`             |
| `nx-layer-knowledge`         | `--nx-layer-knowledge`         |
| `nx-layer-twin`              | `--nx-layer-twin`              |
| `nx-layer-analytics`         | `--nx-layer-analytics`         |
| `nx-holo-edge`               | `--nx-holo-edge`               |
| `nx-holo-edge-hover`         | `--nx-holo-edge-hover`         |
| `nx-holo-edge-press`         | `--nx-holo-edge-press`         |
| `rv-ink`                     | `--rv-ink`                     |
| `rv-ink-2`                   | `--rv-ink-2`                   |
| `rv-ink-3`                   | `--rv-ink-3`                   |
| `rv-surface`                 | `--rv-surface`                 |
| `rv-surface-2`               | `--rv-surface-2`               |
| `rv-chip`                    | `--rv-chip`                    |
| `rv-chip-strong`             | `--rv-chip-strong`             |
| `rv-hairline`                | `--rv-hairline`                |
| `rv-hairline-soft`           | `--rv-hairline-soft`           |
| `rv-series-1`                | `--rv-series-1`                |
| `rv-series-2`                | `--rv-series-2`                |
| `rv-series-3`                | `--rv-series-3`                |
| `rv-series-4`                | `--rv-series-4`                |
| `rv-series-5`                | `--rv-series-5`                |
| `rv-series-6`                | `--rv-series-6`                |
| `rv-tone-danger`             | `--rv-tone-danger`             |
| `rv-tone-warning`            | `--rv-tone-warning`            |
| `rv-tone-success`            | `--rv-tone-success`            |
| `rv-tone-info`               | `--rv-tone-info`               |

Standard Tailwind color ramps (amber, blue, cyan, emerald, fuchsia, gray, green, indigo, neutral, purple, red, rose, sky, slate, teal, violet, zinc) are available at steps 50–950 — apply with `bg-<hue>-<step>`, `text-<hue>-<step>`, etc.

## Typography

Typography classes (`font-*` for families, `text-*` for sizes):

| Class         | CSS variable          |
| ------------- | --------------------- |
| `font-sans`   | `--font-sans`         |
| `font-arabic` | `--font-arabic`       |
| `font-amiri`  | `--font-amiri`        |
| —             | `--nx-text-soft`      |
| —             | `--nx-text-muted`     |
| —             | `--stage-line`        |
| —             | `--sd-line`           |
| —             | `--sd-line-strong`    |
| —             | `--at-line`           |
| —             | `--at-line-soft`      |
| —             | `--tw-line`           |
| —             | `--op-line`           |
| —             | `--twin-line`         |
| —             | `--ana-line`          |
| —             | `--chrome-line`       |
| —             | `--arabia-panel-line` |
| —             | `--ops-line`          |
| —             | `--sdc-line`          |

## Spacing

Apply with any spacing utility: `p-<name>`, `m-<name>`, `gap-<name>`, `space-<name>`, `w-<name>`, `h-<name>`, etc.

| Name | CSS variable     |
| ---- | ---------------- |
| —    | `--nx-shell-gap` |
| —    | `--nx-space-4`   |
| —    | `--nx-space-8`   |
| —    | `--nx-space-12`  |
| —    | `--nx-space-16`  |
| —    | `--nx-space-24`  |
| —    | `--nx-space-32`  |
| —    | `--nx-space-48`  |
| —    | `--nx-space-64`  |
| —    | `--nx-space-96`  |
| —    | `--rv-gap`       |

## Border Radius

Border-radius classes:

| Class         | CSS variable         |
| ------------- | -------------------- |
| `rounded-sm`  | `--radius-sm`        |
| `rounded-md`  | `--radius-md`        |
| `rounded-xl`  | `--radius-xl`        |
| `rounded-2xl` | `--radius-2xl`       |
| `rounded`     | `--radius`           |
| —             | `--nx-card-radius`   |
| —             | `--brand-art-radius` |
| —             | `--nx-radius-8`      |
| —             | `--nx-radius-12`     |
| —             | `--nx-radius-16`     |
| —             | `--nx-radius-20`     |
| —             | `--rv-radius`        |

## Shadows

Box-shadow classes:

| Class             | CSS variable         |
| ----------------- | -------------------- |
| `shadow-glow`     | `--shadow-glow`      |
| `shadow-emerald`  | `--shadow-emerald`   |
| `shadow-elevated` | `--shadow-elevated`  |
| `shadow-card`     | `--shadow-card`      |
| `shadow-neon`     | `--shadow-neon`      |
| —                 | `--sd-shadow-1`      |
| —                 | `--sd-shadow-2`      |
| —                 | `--sd-shadow-3`      |
| —                 | `--twin-face-shadow` |
| —                 | `--nx-card-shadow`   |
| —                 | `--nx-shadow-e1`     |
| —                 | `--nx-shadow-e2`     |
| —                 | `--nx-shadow-e3`     |
| —                 | `--nx-shadow-e4`     |

## Other

Reference via `var(--name)` in inline styles or CSS.

| CSS variable             |
| ------------------------ |
| `VIDEO.width`            |
| `VIDEO.height`           |
| `VIDEO.fps`              |
| `DUR.mapExplainer`       |
| `--nx-region-rgb`        |
| `--input`                |
| `--sidebar`              |
| `--gradient-emerald`     |
| `--gradient-hero`        |
| `--gradient-surface`     |
| `--gradient-glass`       |
| `--gradient-exec`        |
| `--hv-film-opacity`      |
| `--hv-scrim-mix`         |
| `--holo-glow`            |
| `--sev-critical`         |
| `--sev-high`             |
| `--sev-medium`           |
| `--sev-healthy`          |
| `--sev-idle`             |
| `--sadeed-rule-dir`      |
| `--sd-arch-reflect`      |
| `--sd-arch-ease`         |
| `--pv-spring`            |
| `--pv-glide`             |
| `--pv-swift`             |
| `--pv-t-micro`           |
| `--pv-t-hover`           |
| `--pv-t-layer`           |
| `--pv-t-ambient`         |
| `--pv-diffuse`           |
| `--hx-iris`              |
| `--hx-fallback`          |
| `--hx-ic`                |
| `--glass-sheen`          |
| `--glass-lift`           |
| `--bp-grid`              |
| `--bp-grid-fine`         |
| `--at-cell`              |
| `--at-cell-hot`          |
| `--sv-gold-soft`         |
| `--sv-hair`              |
| `--sv-ink-3`             |
| `--tw-glow`              |
| `--tw-plate`             |
| `--nx-clockbar-h`        |
| `--nx-chrome-btn-size`   |
| `--nx-hairline-w`        |
| `--pulse-ink`            |
| `--orb-beat`             |
| `--nx-plate-w`           |
| `--ana-navy`             |
| `--ana-ink`              |
| `--ana-slate`            |
| `--ana-pill`             |
| `--ana-pill-ink`         |
| `--ana-lift`             |
| `--ana-up`               |
| `--ana-bar-b`            |
| `--ana-grid`             |
| `--ana-row`              |
| `--ana-slice-3`          |
| `--ana-slice-other`      |
| `--ana-slice-2`          |
| `--nx-sysnav-w`          |
| `--nx-hdr-h`             |
| `--nx-topbar-total`      |
| `--chrome-tint`          |
| `--chrome-surface`       |
| `--chrome-well`          |
| `--chrome-well-soft`     |
| `--chrome-well-strong`   |
| `--chrome-navy`          |
| `--chrome-bell`          |
| `--chrome-shade`         |
| `--kpi-navy`             |
| `--kpi-ink`              |
| `--kpi-alarm`            |
| `--kpi-change`           |
| `--kpi-wash-a`           |
| `--kpi-wash-b`           |
| `--kpi-tone`             |
| `--arabia-panel`         |
| `--arabia-glass`         |
| `--arabia-slate`         |
| `--arabia-deep`          |
| `--arabia-ground`        |
| `--arabia-blue-deep`     |
| `--arabia-green`         |
| `--arabia-red`           |
| `--arabia-up`            |
| `--arabia-arrow`         |
| `--arabia-hit`           |
| `--vis-w`                |
| `--vis-x`                |
| `--slot-left`            |
| `--slot-top`             |
| `--plot-ar`              |
| `--slot-reserve`         |
| `--ops-navy`             |
| `--ops-slate`            |
| `--ops-divider`          |
| `--ops-pill`             |
| `--ops-pill-ink`         |
| `--ops-lift`             |
| `--ops-chip-glyph`       |
| `--ops-chip-bg`          |
| `--ops-chip-fg`          |
| `--pm-ground`            |
| `--pm-street`            |
| `--pm-route`             |
| `--pm-route-deep`        |
| `--pm-route-glow`        |
| `--pm-pin`               |
| `--pm-pin-deep`          |
| `--pm-park`              |
| `--pm-water`             |
| `--sdc-tint`             |
| `--sdc-navy`             |
| `--sdc-slate`            |
| `--sdc-chip`             |
| `--sdc-bubble`           |
| `--sdc-shade`            |
| `--sdc-persona-w`        |
| `--sdc-persona-h`        |
| `--sdc-persona-bleed`    |
| `--sdc-frame-x`          |
| `--sdc-frame-y`          |
| `--sdc-frame-w`          |
| `--sdc-fade-1`           |
| `--sdc-fade-2`           |
| `--sdc-fade-3`           |
| `--sdc-fade-dir`         |
| `--nx-draw-len`          |
| `--nx-ico-delay`         |
| `--nx-touch-min`         |
| `--nx-opacity-72`        |
| `--nx-opacity-56`        |
| `--nx-opacity-38`        |
| `--nx-opacity-24`        |
| `--nx-opacity-14`        |
| `--nx-opacity-8`         |
| `--nx-opacity-6`         |
| `--nx-opacity-4`         |
| `--nx-glow-focus`        |
| `--nx-glow-agent`        |
| `--nx-glow-authority`    |
| `--nx-glow-critical`     |
| `--nx-glow-sector`       |
| `--nx-holo-rgb`          |
| `--nx-holo-rest`         |
| `--nx-holo-hover`        |
| `--nx-holo-press`        |
| `--nx-blur-12`           |
| `--nx-blur-16`           |
| `--nx-blur-20`           |
| `--nx-blur-24`           |
| `--nx-anim-micro`        |
| `--nx-anim-fast`         |
| `--nx-anim-base`         |
| `--nx-anim-slow`         |
| `--nx-anim-cinematic`    |
| `--nx-anim-count`        |
| `--nx-anim-stagger`      |
| `--nx-ease-out`          |
| `--nx-ease-inout`        |
| `--nx-loop-breathe`      |
| `--nx-loop-pulse-sector` |
| `--nx-loop-shimmer`      |
| `--nx-loop-ambient`      |
| `--nx-loop-dots`         |
| `--nx-loop-dash`         |
| `--nx-move-1`            |
| `--nx-move-4`            |
| `--nx-move-8`            |
| `--nx-move-16`           |
| `--nx-move-24`           |
| `--nx-z-canvas`          |
| `--nx-z-panel`           |
| `--nx-z-raised`          |
| `--nx-z-chrome`          |
| `--nx-z-overlay`         |
| `--nx-z-modal`           |
| `--nx-z-toast`           |
| `--nx-z-voice`           |
| `--rpt-grid`             |
| `--rpt-series-4`         |
| `--rpt-series-5`         |
| `--rpt-series-6`         |
