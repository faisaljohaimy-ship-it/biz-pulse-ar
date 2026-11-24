# Owner follow-up — 2026-11-24

The owner requested the exact attached command-room image before the SADEED film
on the system homepage, with direct deployment and no CI. This supersedes the
film-first order and 1320×720 package image in FR-001/FR-003 for this small change.
No workflow or deployment-protection setting is weakened.

Acceptance: the homepage renders one full-frame responsive derivative of the
owner's 1280×698 JPEG (SHA-256 `1008e89f8ef301f286dd1448ecfd6bc1805e91547c66a491ee99626fab8b574a`)
before `IdentityFilmHero`, in Arabic and English, without horizontal overflow.
The film controls/media and localized image disclosure remain intact.

Implementation: reuse `HomeBrandRow`, the existing image-preparation script and
archived exact JPEG; replace the two served WebP variants, retain their manifest,
move the existing figure above the film and prioritize its first-screen loading.
The existing normalized screen-light overlay remains inside the same screens.
Public/home image bytes decrease by 2,606 B; the 400 KiB ceiling is unchanged.

Verification uses the existing image/order/byte contracts, TypeScript, ESLint,
local build/budgets and responsive browser inspection. Results and release
receipts are recorded only after observation; no CI result is claimed.
