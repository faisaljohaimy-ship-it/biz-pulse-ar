# 06 — Navigation · نظام التنقّل

**Navigation components style the EXISTING navigation model — routes, hierarchy and
entries are frozen architecture. This doc specifies chrome, never structure.**

---

## The eight navigators

| Component           | Purpose                                                              | Spec                                                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NxTopNav**        | The OS bar: identity, clock, global actions                          | 64px, `--nx-ink` @ 92% + blur 16, E3-sticky (z-30); contents RTL: logo/wordmark (right) → live clock chip → global search trigger → notifications Icon Button → SADEED Button → account (left); bottom border white 8%; never grows taller |
| **NxSideNav**       | Primary sections rail                                                | right side (RTL), 72px collapsed (icons) / 264px expanded; items 48px: icon-24 + label; active = cyan text + 2px inset right-edge indicator + 6% wash; section groups separated 24; collapse state persists; tooltip labels when collapsed |
| **NxContextNav**    | Within-section local nav (e.g., directive sections)                  | vertical list inside content, Label 12 headers, items 40px Ghost-style; scrollspy highlights current; sticky within panel                                                                                                                  |
| **NxBreadcrumb**    | Where am I (depth ≥ 2 only)                                          | Label 12; separator ‹ (points deeper = leftward in RTL); current segment 100% non-link, ancestors 56%; collapses middle segments to … beyond 4; mobile: shows parent only ("‹ الرجوع إلى…")                                                |
| **NxTabs**          | Peer views of one subject                                            | 48px row, Label/Body 14-500; active = pearl 100% + 2px cyan underline sliding 200ms; inactive 56%; ≤ 6 tabs, overflow scrolls with fade edges (never dropdown-hides tabs); arrow-key navigation, `role="tablist"`                          |
| **NxExecutiveMenu** | The command palette (⌘K / زر SADEED طويل)                            | E4 modal glass, ExecutiveSearch on top; sections: إجراءات · شاشات · SADEED; items with domain chips; recency-ranked; keyboard-only operable end-to-end                                                                                     |
| **NxShellMenu**     | Browsing Adaptive Shell artifacts (skills/agents/tools/capabilities) | drawer (doc 08) with violet layer accent; kind filter chips; items = ShellCard sm rows; version + status chips; read/browse affordance only — no execution surface                                                                         |
| **NxRuntimeNav**    | Runtime/module areas switcher                                        | segmented control style: 40px, glass container, options with runtime glyphs; active solid `--nx-card`; ≤ 5 segments, else use Tabs                                                                                                         |

## Laws

1. **One primary wayfinding system visible at a time** — SideNav + Tabs is fine
   (levels), SideNav + a second rail is not.
2. Active state is always double-coded: color + indicator geometry (a11y).
3. Navigation chrome never scrolls out (TopNav, SideNav sticky); content scrolls under.
4. Badges on nav items: dot (unseen) or count ≤ 99+; critical badge uses status glyph
   too.
5. Mobile: SideNav becomes bottom sheet triggered from TopNav menu Icon Button; bottom
   tab bar is **not** introduced (the OS keeps one nav grammar).

## Motion

SideNav expand/collapse 200ms width ease-out (labels fade 100ms after); tab underline
slides; palette opens 200ms fade+scale-98→100; all exits 150ms. No parallax, no nav
entrance animations on route change — navigation must feel instant (route content may
skeleton, chrome never blinks).

## A11y & RTL

Landmarks: `<header>`, `<nav aria-label>` per navigator; skip-link ("تخطَّ إلى المحتوى")
first-focusable; palette traps focus; breadcrumb `aria-current="page"`. RTL: rail right,
chevrons point left for deeper, underline animations respect direction.
