# 05 — KPI Components · مكوّنات المؤشرات

**Numbers are the currency of the executive OS (Constitution Ch. 01 §4, Ch. 04). These
ten components are the only sanctioned ways a metric appears.**

---

## Shared laws

- Every KPI renders the four truths: value + unit + time reference + source class.
- Numerals: Western Arabic digits, tabular, Latin stack (Ch. 04).
- Status colors only via semantic state; sector colors only beside sector identity.
- Thresholds come from data/config, never hardcoded in components.

## The ten components

| Component | Purpose | Spec |
|---|---|---|
| **NxKpiNumber** | The number itself | sizes: sm Body-700 16 · md 24 · lg Display 48 · xl Display-XL 72/96; unit Label at 56% trailing-left; never wraps/truncates (container grows or size drops — automatic step-down allowed) |
| **NxDelta** | Change vs reference | chip 8-radius: ▲/▼ glyph + signed value + % ; semantic color by *desired direction* (an increase can be bad) — direction map is a required prop; below noise threshold renders neutral "مستقر" (Ch. 09 anti-tick-noise law) |
| **NxTrend** | Direction word + arrow | صاعد / هابط / مستقر + rotated arrow glyph; Label size; colors as NxDelta |
| **NxSparkline** | Shape of recent history | 96–160×32; single line 2px in context accent @ 72%, no axes/dots except last-point dot; area fill accent @ 8%; tooltip on hover with value+time |
| **NxGauge** | Value within a bounded range | 180° arc, 8px track white 8%, fill context accent; threshold ticks; value = KpiNumber md center; **only** for genuinely bounded metrics (utilization, attainment) |
| **NxProgressRing** | Completion of a known whole | full circle 4px, % center sm; determinate only — unknown progress uses doc 11 loaders, never a fake ring |
| **NxHeatIndicator** | Intensity across a set (grid/strip) | cells 8-radius; single-hue ramp (accent 8%→80%) never red-green ramps; legend mandatory; cell tooltip value |
| **NxStatusIndicator** | Entity state at a glance | dot 8px + Arabic word (+ optional chip container); colors from status set; pulsing dot only for "live/receiving" (2s loop) |
| **NxExecutiveKpi** | The boardroom hero assembly | KpiNumber xl + Delta + Trend + Sparkline + title/footer — composed per KpiCard layout; hero glow rights per Ch. 02 (only as screen hero); 4K: numerals 96, viewing-distance verified |
| **NxAnimatedKpi** | Value-change presentation | wraps KpiNumber: count-up 400ms ease-out **on data change only** (never on mount/scroll — theater ban); flash of delta color at 12% background 600ms; reduced-motion: instant swap |

## Composition

KPI grid caps: 4-across desktop, 6 on 4K wall, 2 mobile (Ch. 09). A KPI without a
decision consumer fails the Ch. 01 litmus and is removed. Gauges and rings never sit in
the same group (two circular metaphors compete); pick per metric family.

## A11y

Numbers carry full accessible text ("معدل التوافر ٩٩٫٢ بالمئة، ارتفاع ٠٫٣ نقطة منذ
الأمس"); sparklines/gauges get text alternatives summarizing shape ("اتجاه صاعد خلال ٣٠
يومًا"); color-carried state always doubled by glyph/word.
