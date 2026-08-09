# Chapter 03 — Color System

**The complete enterprise palette. Canonical implementation: `src/styles.css` (`--nx-*`)
and `src/lib/regions.ts` (sector accents — the ONLY source of sector color).**

---

## Design reasoning

SADEED is dark-first: a deep blue-black night in which light means something. The palette
therefore has _one_ luminous accent family (cyan — the command signal), _one_ rationed
authority color (gold), a strict status trio, four sector accents that are the only
polychrome celebration in the system, and a layer palette so each architectural stratum
(Runtime, Adaptive Shell, Agents, Knowledge, Digital Twin, Analytics) is recognizable at
a glance. Everything else is neutral depth.

## 1 · Core brand

| Token        | Role                                               | HEX       | RGB         | HSL           |
| ------------ | -------------------------------------------------- | --------- | ----------- | ------------- |
| `--nx-cyan`  | **Primary** — command accent, focus, links, active | `#00D4FF` | 0 212 255   | 191° 100% 50% |
| `--nx-exec`  | **Secondary** — executive highlight, selected nav  | `#00B8D9` | 0 184 217   | 189° 100% 43% |
| `--nx-gold`  | Authority — approvals, signatures, milestones      | `#F5C560` | 245 197 96  | 41° 88% 67%   |
| `--nx-pearl` | Primary text on dark                               | `#EAF8FF` | 234 248 255 | 200° 100% 96% |

## 2 · Canvas & neutrals (Background)

| Token               | Role                                          | HEX       | RGB       | HSL               |
| ------------------- | --------------------------------------------- | --------- | --------- | ----------------- |
| `--nx-obsidian`     | Deepest canvas (app background)               | `#020811` | 2 8 17    | 216° 79% 4%       |
| `--nx-ink`          | Section background                            | `#04111F` | 4 17 31   | 211° 77% 7%       |
| `--nx-surface`      | Panel base                                    | `#123B57` | 18 59 87  | 204° 66% 21%      |
| `--nx-card`         | Card base                                     | `#184E77` | 24 78 119 | 206° 66% 28%      |
| Neutral text ladder | pearl `#EAF8FF` → 72% → 56% → 38% white-alpha | —         | —         | see opacity table |

## 3 · Status (Warning / Critical / Success + info)

| Token           | Role                           | HEX       | RGB        | HSL           |
| --------------- | ------------------------------ | --------- | ---------- | ------------- |
| `--nx-success`  | Success / healthy / compliant  | `#20E3B2` | 32 227 178 | 165° 78% 51%  |
| `--nx-warning`  | Warning / degraded / expiring  | `#FFB703` | 255 183 3  | 43° 100% 51%  |
| `--nx-critical` | Critical / breach / veto       | `#FF4D6D` | 255 77 109 | 349° 100% 65% |
| `--nx-info`     | Informational / neutral events | `#4CC9F0` | 76 201 240 | 194° 85% 62%  |

Status colors are **semantic property of state, never decoration**. A red gradient on a
healthy screen is a constitutional violation.

## 4 · Sector accents (from `regions.ts` — single source, never fork)

| Sector            | HEX       | RGB        | HSL          | Meaning              |
| ----------------- | --------- | ---------- | ------------ | -------------------- |
| الوسطى Central    | `#3B82F6` | 59 130 246 | 217° 91% 60% | sector identity only |
| الغربية Western   | `#22D3EE` | 34 211 238 | 188° 86% 53% | sector identity only |
| الشرقية Eastern   | `#22C55E` | 34 197 94  | 142° 71% 45% | sector identity only |
| الجنوبية Southern | `#F59E0B` | 245 158 11 | 38° 92% 50%  | sector identity only |

Sector colors mark _geography and ownership_ (map pulses, region chips, halos). They are
never reused as status — Eastern green does not mean "success", Southern amber does not
mean "warning". Context disambiguates: sector colors appear only beside sector names/geometry.

## 5 · Layer palette (architectural strata)

| Layer token            | Layer                               | HEX       | RGB         | HSL           |
| ---------------------- | ----------------------------------- | --------- | ----------- | ------------- |
| `--nx-layer-runtime`   | **Runtime** (OS/kernel surfaces)    | `#00B8D9` | 0 184 217   | 189° 100% 43% |
| `--nx-layer-shell`     | **Adaptive Shell** (skills/NDK)     | `#8B7CF6` | 139 124 246 | 247° 87% 73%  |
| `--nx-layer-agent`     | **Agent Runtime** (SADEED & agents) | `#00D4FF` | 0 212 255   | 191° 100% 50% |
| `--nx-layer-knowledge` | **Knowledge**                       | `#4CC9F0` | 76 201 240  | 194° 85% 62%  |
| `--nx-layer-twin`      | **Digital Twin**                    | `#22D3EE` | 34 211 238  | 188° 86% 53%  |
| `--nx-layer-analytics` | **Analytics**                       | `#3B82F6` | 59 130 246  | 217° 91% 60%  |

The shell violet is the one _new_ hue this constitution introduces (nothing existing uses
violet, making the Adaptive Shell instantly recognizable). Layer colors are used for:
module chips, layer borders (1px, 24% opacity), and layer glow — never for text.

## 6 · Overlay · Glass · Glow · Shadow

| Token           | Recipe                                     | Use                           |
| --------------- | ------------------------------------------ | ----------------------------- |
| Overlay (scrim) | `#020811` @ 60–80%                         | Modals, drawers, image scrims |
| Glass surface   | `--nx-surface` @ 55–75% + blur 12–24px     | Panels (Ch. 02/06)            |
| Glass border    | `#FFFFFF` @ 8–14%                          | Every glass edge              |
| Glass highlight | `#FFFFFF` @ 4% top inner edge              | Light source consistency      |
| Glow            | accent color @ 25–40%, 24–48px blur radius | State/sector emphasis only    |
| Shadow          | `#020811` @ 45–60%, y-offset 8–24px        | Elevation (Ch. 06 scale)      |

## 7 · Opacity ladder (system-wide)

`100%` solid content · `72%` secondary text · `56%` tertiary text/labels · `38%` disabled
text · `24%` layer borders · `14%` glass borders (strong) · `8%` glass borders (soft) ·
`6%` hover wash · `4%` glass highlight. **No other opacity values.** Custom alphas
multiply like weeds; the ladder keeps depth consistent everywhere.

## 8 · Usage rules

1. **The 80/15/5 law:** any screen ≈ 80% neutrals (canvas+glass), 15% one accent family,
   5% everything else (status chips, sector marks, gold). Exceeding 5% polychrome makes a
   SADEED screen stop looking like SADEED.
2. One accent family per screen: cyan-family by default; a sector page may substitute its
   sector accent as the 15%.
3. Gold: at most one gold element per screen (Principle 6).
4. Status colors appear only on chips, borders, and glyphs — never as panel fills larger
   than 48px in any dimension.
5. Never mix two status colors in one gradient. Gradients are single-hue → transparent.
6. Text is only ever pearl-ladder or `--nx-obsidian` (on light chips like gold/success).

## 9 · Accessibility (contrast law)

Measured against resolved backgrounds (WCAG 2.1 relative luminance):

| Pair                                  | Ratio    | Verdict                             |
| ------------------------------------- | -------- | ----------------------------------- |
| Pearl `#EAF8FF` on Obsidian `#020811` | ≈ 18.9:1 | AAA — body text ✓                   |
| Pearl on Card `#184E77`               | ≈ 9.5:1  | AAA — body text ✓                   |
| Cyan `#00D4FF` on Obsidian            | ≈ 11.7:1 | AAA — links/labels ✓                |
| Cyan on Card                          | ≈ 5.9:1  | AA — labels ✓, avoid long body      |
| Warning `#FFB703` on Obsidian         | ≈ 10.9:1 | AAA ✓                               |
| Critical `#FF4D6D` on Obsidian        | ≈ 6.7:1  | AA large/labels ✓ — pair with glyph |
| Obsidian on Gold `#F5C560`            | ≈ 12.5:1 | AAA — authority chips ✓             |

Binding rules:

- Body text ≥ 7:1; labels/chips ≥ 4.5:1; large display numbers ≥ 3:1 (they also carry
  glyph+position redundancy).
- **Color never carries meaning alone**: every status pairs color with an icon or Arabic
  word (critical for the ~8% of users with color-vision deficiency; the red/green
  Eastern-sector ambiguity is resolved by rule §4 context separation).
- Focus indication: 2px cyan ring at ≥ 3:1 against adjacent colors, never removed.
- Ratios are re-verified in review whenever a background token changes; approximate
  values above are design guidance — tooling is the referee.
