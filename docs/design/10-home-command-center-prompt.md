# 10 — Home Command Center: Engineering Prompt & Specification

**Status: APPROVED FOR EXECUTION · Owner order 2026-10-13 · Scope: the home page `/` (and its alias `/blueprint`)**

> **ملخّص للمالك.** هذا هو البرومت الهندسي الذي طلبتَه لتطبيق صورة «مركز القيادة»
> (`reference/home-command-center-mockup-2026-10-13.jpg`) واجهةً رئيسية للنظام، بكل
> أيقوناتها مفعّلة نحو أقسامها. يُطابق الصورة في **التخطيط والتصميم والاتجاه والأيقونات
> والروابط**، ويأخذ **الأرقام** من النظام نفسه لا من الصورة (المادة ٢٧). قراراتك
> السبعة في §2 مُلزِمة، وما يخالف الصورة لضرورةٍ مكتوبٌ بسببه في §9.

---

## 1. Role and mission

You are the engineering team that turns the owner's mockup into the production home page of
SADEED. You work **inside the existing system**: same routes, same data layer, same shell
components, same token layer, same guards. You are not building a demo and you are not drawing
a picture of a dashboard — every icon, card, chip and row is a working entry point into a real
section of the system, and every number on the page is read from the system or says
«لم يُقَس».

**Definition of success:** an owner who puts the mockup and a screenshot of `/` (light mode,
1536×1024) side by side recognises the same page — same regions of the screen, same order,
same card anatomy, same icons, same visual language — and every click lands in the right
section.

## 2. Owner decisions (2026-10-13, AskUserQuestion — binding; D1–D4 superseded by §2.1 on 2026-10-14)

| # | Question | Owner's answer (verbatim) | Consequence |
|---|---|---|---|
| D1 | Default theme for the whole system | «الداكن افتراضيًّا كما هو» | `DEFAULT_THEME` stays `"dark"`. The page is built for **both** modes; **light mode must match the mockup**, dark mode is its faithful counterpart (Articles 32–34). |
| D2 | Mockup metrics with no source | «أقرب مقياس حقيقي + «لم يُقَس» (موصى به)» | Each card keeps its mockup slot and anatomy, shows the **nearest real measure under its honest name**, and writes «لم يُقَس» where nothing is measured — including every change-%/sparkline slot. |
| D3 | Live cameras & incident photos | «بطاقات حالة بلا صور (موصى به)» | Camera tiles become **status cards** (code, site, state, last alert) styled as the mockup's tiles; incident/risk thumbnails become **category icon tiles**. No `<img>`, no `<video>`, no stock photos. «لا بثّ مرتبط» stays visible. |
| D4 | Sidebar footer card brand | «شعار المنتج كما هو (موصى به)» | The card keeps «معًا نحو بيئة آمنة» + the SADEED product brand. No third-party name, emblem or logo. |
| D5 | Page orientation | «كما في الصورة حرفيًّا» | On the home page the **arrangement is left-to-right as in the mockup**: sidebar on the **left**, map centre-left, SADEED AI card on the **right**, KPI row starting at the left with the security-status card. **Text inside every card stays Arabic `rtl`.** Other pages keep their current right-hand sidebar. |
| D6 | Background film | «يبقى الفيلم خلف التصميم» | `<HoloVideoEngine />` stays mounted with its current rules (0.5×, muted, no toggle, off under reduced motion, opacity/scrim as guarded). Cards sit on it with their glass/surface tokens. |
| D7 | Delivery (recorded in CLAUDE.md) | «الكود مباشر والقاعدة بإذن» | Code goes straight to `main` → Lovable Publish → production check. **No production DB change** without explicit approval — this work needs none. |

**Supersessions.** The owner's instruction «طبق هذا الشكل بالتمام والكمال» is the latest
explicit owner text for the home page (Article 35: the owner's explicit text prevails). It
supersedes these earlier home-page layout decisions, which must be amended in their guards
**deliberately, with a planted-red case each** (Article 30):

- the visible hero `<h1>` title (kept as an accessible, visually hidden `<h1>`);
- the «triad» (region cards · SADEED stage · «توصيات سَدِيد») and its order contract;
- the single risk card (V5) → replaced by the mockup's «أبرز المخاطر» list;
- the «سجل القرارات» ticker (not in the mockup);
- four quick-ask chips → the mockup's six;
- the theme toggle's position: on `/` and `/blueprint` it moves from `TopBar` into the
  header row (as drawn) — **still exactly one toggle on the page**.

Nothing else is superseded. Every constitutional rule in §3 stands.

### 2.1 Owner decisions 2026-10-14 — «طبق الصورة بحذافيرها بكل ما فيها طبق كل شيء» (supersede D1–D4)

The owner re-sent the mockup with «طبق الصورة بحذافيرها بكل ما فيها طبق كل شيء» and answered four
AskUserQuestion items (verbatim choices below). These **supersede D1, D2, D3 and D4** above.
D5, D6 and D7 stand.

| # | Question (short) | Owner's answer (verbatim) | Consequence |
|---|---|---|---|
| N1 | Default theme (was D1) | «الفاتح كما في الصورة (موصى به)» | The whole system opens **light** on first visit. Dark stays one tap away (the single sun toggle) and is still a full health surface: every check and screenshot runs in both modes (Articles 32–34). A saved choice is honoured. |
| N2 | Unmeasured numbers, change arrows and mini charts (was D2) | «محاكاة موسومة مطابقة (موصى به)» | Every number, change arrow/% and mini chart drawn in the mockup is shown **as drawn**, from a **reference simulation** whose values equal the mockup's, under a visible «محاكاة» badge (`is_simulation`). **Live data wins automatically** whenever a read returns live rows; a live value is never decorated with a simulated change line (its change slot then reads «لم يُقَس»). Never `?? 0`; never present simulated figures as measured. |
| N3 | Photos: camera frames, risk/incident thumbnails, patrol map (was D3) | «صور توضيحية موسومة (موصى به)» | Illustrative images in the mockup's style, each labelled «صورة توضيحية — لا بثّ مرتبط» (camera tiles keep the label visible; thumbnails carry it as `alt`/`title` plus one caption per card). Compressed WebP served from `public/home/`; lazy-loaded below the fold; explicit width/height (no layout shift); the JS/CSS budget is unaffected but total image weight on `/` must stay ≤ 400 KB. The patrol map is drawn as SVG (theme-aware), not a photo. |
| N4 | Header logo and assistant persona (was D4) | «طبّق شعار الصورة وشخصيتها (موصى به)» | Header: the mockup's wing emblem (inline SVG, `currentColor`) + «SADEED» wordmark + «Industrial Security AI OS». SADEED AI card: the mockup's persona (ghutra + headset). **Voice unchanged** — SADEED's server male voice only. Guests see «زائر» where the mockup shows a person's name; signed-in users see their own first name and role, never another person's. |

**Interim images.** The generated 2K images cannot be downloaded yet (the environment's network
policy blocks the image CDN; the owner was told on 2026-10-14). Until it is opened, each image
slot uses the matching crop of the owner's own mockup (`docs/design/reference/…`), which is
pixel-identical at the mockup's 1536×1024 size; the 2K versions replace them file-for-file later.

**Sidebar footer card (was D4's other half):** text as drawn — «معاً نحو بيئة آمنة» and
«السعودية للطاقة» with the green dot — over a dusk skyline image (N3 rules).

**Deliberate deviations from «كل شيء»** (reported to the owner):
- the sidebar card's palm-and-crossed-swords national emblem is not reproduced (the Saudi
  national emblem's use is legally restricted); a palm silhouette stands in;
- a person's name in the header («فيصل الغامدي») is never hard-coded (N4).

## 3. Non-negotiables (load-bearing walls)

1. **Article 27 — numeric honesty.** No number on the page that the system did not measure.
   Absent ⇒ «لم يُقَس» as text, never `0`, never an empty arc, never `?? 0`. Loading,
   error and not-measured are three different states. One source per number: a header count
   and the list under it come from the same rows.
2. **Layer 4 — data never empties.** Display reads use `optionalSupabaseAuth` +
   `resilient()` (4 s race, labelled simulation fallback). Gate queries with
   `enabled: !authLoading` only — never `!!user`. The page-level disclosure line stays:
   «… وإلا فمن محاكاةٍ مرجعية مدمجة».
3. **Personal data.** Never render incident `owner`/creator names, work-order `notes` or
   `created_by` (SEC-01), visitor names, or any identifier of a person. Aggregates only.
4. **Articles 32–34 — two modes.** No theme class in JSX. No colour outside the token layer
   (`--ink*`, `--surface*`, `--chip*`, `--hairline*`, `--tone-*`, `--glass-*`, region tint
   vars). No hex in TSX. No `fill="white"` (use `currentColor`). Inline styles pass
   **variables** only (`--region-tint`, `--kpi-tone`, `--slice-tone`). Inside always-dark
   surfaces (map card, camera tiles) never use `text-white`/`bg-white` utilities — re-declare
   the ink tokens locally as `.nx-arabia` does (the light bridge remaps `--color-white`).
5. **Status semantics.** Danger = red + **octagon** + «خطر»; warning = amber + **triangle** +
   «تحذير»; healthy = emerald + circle + «سليم»; not measured = neutral dashed circle.
   Colour is never the only carrier (WCAG 1.4.1). Counts and categories are not verdicts:
   KPI icons and category slices use only `--tone-blue`, `--tone-cyan`, `--tone-violet`.
   (The mockup's red/amber/green KPI icons and donut slices are therefore drawn in the
   identity tones; the mockup's red *triangles* become octagons.)
6. **Geography.** `src/lib/regions.ts` is the only source of region names, order and
   accents. No quoted region name in TSX. Region colour reaches CSS only as `--region-tint`.
7. **Accessibility floors.** Text ≥ 12 px **as rendered** (SVG text measured after viewBox
   scaling). Targets ≥ 44 px on touch, ≥ 40 px on mouse — tabs, chips, zoom buttons,
   send/attach included. Visible focus via the shared unlayered focus rule (no
   `focus-visible:outline-*` utilities). Icon contrast ≥ 3:1 in both modes (region accents
   on white fail — use a tinted container with a dark glyph). No horizontal scroll at
   375/390 px. Keyboard reachable in visual order.
8. **Performance budget.** Total JS headroom ≈ 129 KiB (lazy chunks count), CSS headroom ≈
   73 KiB. New code lives only in the lazy home chunk (imported from `-blueprint-page.tsx`
   or `HomeDashboard.tsx`), never from `__root`, `app-shell`, `SystemHeader`,
   `SystemSidebar` statics that would grow shared chunks. Charts are **pure SVG** (no new
   recharts types). No copilot module imported into the home page — the SADEED card talks
   to the singleton only through `useSadeed()` (`open`, `ask`).
9. **Voice & assistant.** One `SadeedCopilot` (in `__root`). No `speechSynthesis`. No
   `useChat`/`DefaultChatTransport` on the home page. `MessageResponse` stays banned.
10. **Map.** Keep `<ArabianPeninsulaMap>` (never `RegionPulseMap`), its «ليست حدودًا رسمية»
    disclaimer and `isInsideSaudi`. **No `absolute` overlay inside or right after the map
    SVG** — the guard records a real defect (floating labels hid 3 of 4 sites). Everything
    the mockup floats over the map is laid out **beside or below** it in normal flow.
11. **Shell.** One sidebar component fed only by `SYSTEM_NAV` (20 items). One bell (in
    `SystemHeader`, → `/urgent-ops`, counts `urgent_open`, no «إشعار», simulation disclosed in
    its label). Keep `<QuickReport>` (lazy). The user chip shows the real name or «زائر» —
    never an invented name or role.
12. **Delivery gate.** tsc → eslint → vitest → `npm run build` → performance budget →
    background contrast → `nexios-qa-guardian` clearance → commit → push to `main` (after
    `git fetch`, Article 35) → Lovable Publish → production check (`workflow_dispatch`),
    with `ui-audit` run in **both** themes.

## 4. Page anatomy — element by element

Reference: `reference/home-command-center-mockup-2026-10-13.jpg` (1536×1024, light mode).
Coordinates below are physical (left → right), per D5.

### 4.0 Frame

- `<main class="nx-bp-surface">` keeps `<SystemSidebar />`, `<CommandPalette />`,
  `<HoloVideoEngine />`, `<SystemHeader withMenu />`.
- **Orientation (D5).** The home arrangement container is laid out left-to-right; every text
  block inside it is `dir="rtl"`. Implement with an arrangement wrapper (`dir="ltr"` on the
  layout grid only, `dir="rtl"` on each card/leaf) or explicit grid areas — never by flipping
  text direction of Arabic content. The sidebar is pinned to the **left** on `/` and
  `/blueprint` only (a `side` prop or a home-scoped modifier on the existing component; its
  spacer moves with it). All other pages are unchanged.
- An accessible `<h1>` stays in the DOM (visually hidden) carrying the product name.
- Desktop grid (≥ 1280 px): sidebar 216–232 px · content column with 16 px gutters · rows:
  header → KPI row → hero row (map ≈ 5/7, SADEED AI ≈ 2/7) → operations row (4 cards) →
  analytics row (4 cards) → disclosure line.
- Tablet (768–1279): KPI row wraps 4+3; hero stacks (map, then SADEED AI); rows become 2×2.
- Phone (≤ 767): single column; sidebar becomes the existing menu sheet; KPI row is a
  2-column grid; no horizontal overflow.

### 4.1 Header row (top)

| Mockup element | Implementation | Destination / action |
|---|---|---|
| Search «ابحث في النظام…» | existing search button → `nx:open-command-palette` | Command palette |
| Bell with badge | existing `UrgentBell` (badge only when count > 0) | `/urgent-ops` |
| Messages | existing | `/assistant` |
| Apps grid | existing `AppsMenu` | module list |
| Sun / theme | **the single theme toggle**, rendered here on `/` and `/blueprint` (TopBar hides its own on those routes) | toggles theme |
| Help | existing | `/guide` |
| Avatar + name + role | `UserChip`: real `full_name` / `name` / e-mail, else «زائر»; role line only from a real source (org membership role for signed-in members), else omitted | `/settings` |

The header is laid out left→right as drawn: search at the left, icons, user at the right.

### 4.2 Sidebar (left, D5)

Existing `SystemSidebar` + `SYSTEM_NAV` — already the mockup's 20 items in the mockup's order.
Keep labels, icons, groups (المناطق ▾ from `REGIONS`, المرافق ▾), the active pill, and the
footer card per D4. Only its **side** changes on the home page.

### 4.3 KPI row — 7 cards (left → right as drawn)

Card anatomy (all 7): icon tile (identity tone) · label · value (+unit) · a change line in the
slot where the mockup draws "↑ x%" and a sparkline, reading «التغيّر: لم يُقَس» (D2). Every
card is a link. Exactly 7 entries in the `kpis` registry, each with `status: statusOf(...)`.

| # | Mockup label | Shown label (honest, D2) | Source | Link |
|---|---|---|---|---|
| 1 | الحالة الأمنية العامة | «الامتثال العام» — mean of **measured** regions' `compliance_pct` (subtitle «متوسط المناطق المقيسة»); none measured ⇒ «لم يُقَس» | `getCommandCenterState().regions[].compliance_pct` (`!== null`) | `/sec/governance` |
| 2 | الحوادث النشطة | «البلاغات المفتوحة» | `getSecOverview().counts.incidents_open` | `/sec/incidents` |
| 3 | المخاطر الحرجة | «مخاطر عالية» (critical is folded into high by the source) | `getRiskBoard().rows` severity `high` | `/sec/risks` |
| 4 | إجمالي الأفراد | «حرّاس المواقع» | sum of `sites[].guards_count` | `/sec/shifts` |
| 5 | الدوريات النشطة | «الدوريات النشطة» | `counts.patrols_active` | `/sec/patrols` |
| 6 | الكاميرات العاملة | «الكاميرات المتصلة» — value «N من M» | `getExecKpis().cameras_online / cameras_total` | `/sec/cctv` |
| 7 | الأصول الحرجة | «أصول خارج الخدمة» (keep the guarded description «أصول حالتها غير متصلة أو متدهورة») | `counts.assets_offline` | `/sec/maintenance` |

### 4.4 Hero row — map card (centre-left)

Dark card in **both** modes (tokens re-declared locally). Normal-flow composition:

- **Top bar:** view tabs «خريطة السعودية» (active, shows the map) · «مخطط صناعي» (link →
  `/sec/twin`) · «طبقات» (toggles the layers rail); region chips «جميع المناطق» + the 4
  regions from `REGIONS` (focus/highlight, `aria-pressed`).
- **Body (row):** control rail (zoom in, zoom out, reset view — real viewBox zoom on the SVG;
  "expand" → `/executive-map`) · `<ArabianPeninsulaMap>` with region glow (stronger neon
  bloom in tokens, safe-mode/forced-colors fallbacks, reduced-motion still) · layers rail: the
  8 mockup layers as **links** — المرافق → `/sec/facilities`, الكاميرات → `/sec/cctv`,
  الدوريات → `/sec/patrols`, نقاط الدخول → `/sec/access`, الأفراد → `/sec/shifts`, الأصول →
  `/sec/maintenance`, المخاطر → `/sec/risks`, الحوادث → `/sec/incidents`.
- **Bottom (row):** quick-stats strip «إحصائيات سريعة» — المرافق «لم يُقَس» · المواقع
  (`sites` count) · الكاميرات (`cameras_total`) · نقاط الدخول (`gates_total`); and the 4 region
  chips (site count · compliance % or «لم يُقَس») linking to `/sec?region=…` + `setRegion`.
  The mockup's floating per-region callouts live here — per-region incident counts and %
  deltas are not measurable (§9).
- The «رسم تمثيلي … ليست حدودًا رسمية» disclaimer stays.

### 4.5 Hero row — SADEED AI card (right)

Restyle `SadeedStagePresence` into the mockup's compact card: header «SADEED AI» +
«المساعد التنفيذي للأمن الصناعي»; presence pill (honest: «متصل الآن» only when the chat
health endpoint reports readiness — readiness is an OR across capable keys — otherwise the
truthful state); the existing portrait (no new persona, D4 identity); greeting bubble
«مرحبًا {الاسم الأول | بك}، كيف يمكنني مساعدتك اليوم؟»; six quick-action chips in two
columns — ملخّص الحالة الأمنية · أبرز المخاطر اليوم · حلّل حادثًا معيّنًا · تقرير دوريات
المنطقة · اقتراحات تحسين · تتبّع كاميرات الموقع — each `useSadeed().open({focus:true})` +
`ask(prompt)`; and an inline composer (textarea + send + attach): send ⇒ `open` + `ask(text)`;
attach ⇒ open the panel where the file picker lives. Keep `SadeedMuteToggle`,
`requestVoiceConversation`, `SadeedVideoAvatar`, the portrait poster and the
`aria-live="polite"` «يتحدّث الآن» state.

### 4.6 Operations row (left → right as drawn)

| Card | Content (D2/D3) | Header link |
|---|---|---|
| **أبرز المخاطر** | top 4 rows of `getRiskBoard()` by severity: category icon tile, title, region name (from `REGIONS`, else «لم يُقَس»), severity chip with shape + word | `/sec/risks` («عرض الكل») |
| **الحوادث النشطة** | latest 4 open incidents: category icon tile, title, city/region, Arabic **status** chip, relative time; no names | `/sec/incidents` |
| **الدوريات الميدانية** | total + status split with honest words (نشطة · مجدولة · مكتملة · فائتة); a compact progress visual from `checkpoints_done/total` instead of a route map (no route geometry exists); button «إدارة الدوريات» | `/sec/patrols` |
| **كاميرات مباشرة** | 4 dark **status tiles** shaped like video frames: camera icon, `camera_code`, site, alert type, state chip, time; caption «بطاقات حالة — لا بثّ مرتبط» | `/sec/cctv` |

### 4.7 Analytics row (left → right as drawn)

| Card | Content | Header link |
|---|---|---|
| **الأداء الأمني للمناطق** | the 4 regions in `REGIONS` order (left→right as drawn): tinted icon tile with dark glyph, name, compliance % (subtitle «نسبة الامتثال»), change «لم يُقَس»; each → `/sec?region=…` + `setRegion` | `/sec/governance` |
| **إحصائيات …** (mockup: الحوادث والمخاطر) | nearest **real** monthly series: «أوامر الصيانة شهريًّا» — bars = requested, line = completed, from live `maint_analytics.monthly`; pure SVG bar+line; `retry: false`, honest error state (no simulation for maintenance) | `/sec/maintenance` |
| **توزيع أنواع الحوادث** | existing category donut (top 3 + «أخرى», identity tones), total in the centre, legend with % | `/sec/incidents` |
| **حالة الأنظمة** | rows with shape+word status: نظام المراقبة (CCTV) — `cctv_health` % · التحكم في الدخول — `access_health` % · الدوريات — «إنجاز نقاط التفتيش» `patrol_completion` % · تكامل SAP — integration health word · منصة IoT — sensors in alarm «N من M» or «لم يُقَس»; each row → its page | `/integrations` |

### 4.8 Disclosure line (bottom)

Keep the guarded disclosure text (sources live where available, «وإلا فمن محاكاةٍ مرجعية
مدمجة»), small and quiet, under the analytics row.

## 5. Visual language

- **Light (mockup):** page `--surface-2`; cards `--surface` with `--hairline` border, radius
  16 px, soft shadow token; titles `--ink` 800; secondary `--ink-2`/`--ink-3`; accents
  `--tone-blue`/`--sd-azure`; chips `--chip`. **Dark:** the same structure on the existing
  dark tokens and glass — no new palette.
- Icon tiles: 40–44 px rounded squares, tinted fill + dark glyph (light) / tinted glass +
  bright glyph (dark).
- Typography: IBM Plex Sans Arabic (global weight floor 700, headings 800); numerals in the
  value slot use tabular figures.
- Motion: static cards (owner 2026-08-09); hover/focus feedback only; map glow may pulse
  slowly with a `prefers-reduced-motion` exit; `translate`/`scale` properties with
  `--nx-ease-out`, never `transform: scale/translate` in the blueprint layer.
- `forced-colors` and `prefers-reduced-transparency` fallbacks for every new surface.

## 6. Engineering plan

1. **Foundation** — `-blueprint-page.tsx` rebuilt to §4.0: arrangement wrapper, row slots,
   hidden `<h1>`, sidebar `side="left"` on home, theme toggle relocated (single source),
   removal of triad / ticker / single risk card, disclosure kept. New components live in
   `src/components/home/` and are imported only by the page.
2. **Panels in parallel, disjoint files** — KPI row (`HomeDashboard.tsx`), map card (+ zoom
   support in `ArabianPeninsulaMap.tsx`), SADEED AI card, operations row, analytics row; each
   with its own CSS block, token-only.
3. **Guards** — amend every guard listed in §8 with a planted-red case; extend
   `home-dashboard.contract` to read every new home file (Article 31: no blind surface).
4. **Verify** — full gate; local preview (built `.output` served with `wrangler dev`) +
   Playwright screenshots at 1536×1024 (mockup size), 1280×800, 768×1024, 390×844 in **light
   and dark**; side-by-side with the mockup; `ui-audit` floors in both themes; axe.
5. **Review** — independent lenses (visual fidelity · accessibility & RTL text · Article 27 &
   personal data · guards & budget); every finding adversarially verified before it is fixed.
6. **Deliver** — §3.12.

## 7. Tool routing (Phase 15)

| Task | Destination | Method | Dependency | Proof |
|---|---|---|---|---|
| Implementation, tests, guards | GitHub repo `faisaljohaimy-ship-it/biz-pulse-ar`, `main` | Claude Code (code) | — | gate green + guardian clearance |
| Parallel build & review | Claude Code workflows (sub-agents) | orchestration | — | structured results, adversarial verification |
| Visual verification | local preview of the built `.output` + Playwright/Chromium | screenshots, ui-audit, axe | Chromium at `/opt/pw-browsers` | screenshots vs mockup, both themes |
| Data | existing server functions (Supabase via Lovable) | read-only | none — **no DB change** (D7) | panels render live or labelled simulation |
| Publish | Lovable project `6f092c67-…` | `deploy_project` | Lovable MCP | `latest_commit_sha` = pushed commit |
| Production verification | GitHub Actions `production-check.yml` | `workflow_dispatch` | GitHub MCP | run green on the published commit |
| Design hand-off (optional) | Figma | code → design capture | owner request | not required for delivery |

## 8. Guards to amend deliberately (each with a planted-red case)

- `src/components/home/home-dashboard.contract.test.ts` — new KPI registry ids; read all new
  home files; page order KPI row → hero (map, SADEED AI) → operations → analytics →
  disclosure; keep: no sparkline/delta/trend words, no `<img>/<video>`, «لا بثّ مرتبط», no
  hex, variables-only inline styles, ≥ 9 live destinations, `PanelBody` states, donut ≥ 12 px.
- `src/routes/blueprint.contract.test.ts` — triad/region-card/risk-arrow/visible-h1 assertions
  replaced by the new anatomy; keep colour, motion, forced-colors and code-split rules.
- `src/components/map/arabia-geometry.contract.test.ts` — still no overlay; add zoom/controls
  in normal flow.
- `src/lib/nav/system-nav.contract.test.ts` — sidebar `side` on home; spacer pairing.
- `src/components/nav/top-bar.contract.test.ts`, `open-changelog.contract.test.ts` — exactly
  one theme toggle per page; on home it lives in the header row.
- `amiri-scope`, `measured-counters`, `holo-background`, `voice-mute`, `singleton`,
  `location-capture`, `screen-names` — must stay green (adapt only if the anatomy moved).
- `scripts/check-background-contrast.mjs` — inks referenced by the page stay measured.

## 9. Mockup elements that cannot be drawn as numbers (and what replaces them)

| Mockup element | Why | Replacement |
|---|---|---|
| Change % + sparklines on KPI cards | no KPI history exists | «التغيّر: لم يُقَس» in the same slot |
| «الحالة الأمنية العامة 96%» | no measured composite (the old composites are banned) | «الامتثال العام» (mean of measured regions) |
| «إجمالي الأفراد» / «الأصول الحرجة» | no source | «حرّاس المواقع» / «أصول خارج الخدمة» |
| Per-region incident counts and deltas on the map | incidents carry no region | region chips with sites + compliance |
| Live camera video and incident photos | no feed, no images (D3) | status tiles and category icons |
| Patrol route map | no route geometry | status split + checkpoint progress |
| 6-month incidents & risks chart | no honest series for either | real monthly maintenance series, titled honestly |
| System uptime % | not measured | the nearest health measure per system, named honestly |
| Name/role «فيصل الغامدي / مهندس AI أول», «السعودية للطاقة» | invented identity / third-party brand (D4) | real user or «زائر»; product brand |

## 10. Acceptance criteria

1. Light-mode screenshot at 1536×1024 matches the mockup's regions, order, anatomy, icons and
   orientation; dark mode is the same layout on dark tokens.
2. Every icon, card, chip, tab, layer item and row on the page navigates to a live,
   non-hidden, non-coming-soon section or performs its stated action.
3. Every number is sourced (§4) or reads «لم يُقَس»; no personal data; disclosure present.
4. ui-audit: text ≥ 12 px, targets ≥ 44/40 px, no horizontal overflow — at all 8 viewports, in
   both themes. Keyboard order follows the visual order; focus always visible.
5. Gate green: tsc, eslint (0 errors), vitest (all, including amended guards with their
   planted-red cases), build, performance budget, background contrast.
6. `nexios-qa-guardian` clearance; pushed to `main`; Published; production check green on the
   published commit.
