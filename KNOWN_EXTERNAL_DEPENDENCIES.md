# NEXIOS AI OS — Known External Dependencies

These items remain below 10/10 **only** because they require credentials, measurements, or business decisions outside the engineering scope. Each is a third-party or operator dependency, not a code defect.

| # | Item | Why it's external | Engineering status | Operator action to close |
|---|---|---|---|---|
| 1 | HeyGen LiveAvatar | Vendor credential + v1/v2 endpoint sunset; new LiveAvatar key required | R3F fallback ships fully functional; HeyGen isolated behind `HeygenAvatarProvider` | Provision a LiveAvatar key and set `HEYGEN_API_KEY` |
| 2 | Lighthouse / Core Web Vitals | Must be measured against the live published URL by an external runner | Code-splitting, lazy 3D, lazy avatar, dynamic imports already in place | Run Lighthouse CI against `biz-pulse-ar.lovable.app` and paste scores |
| 3 | axe-core Accessibility audit | Must be measured against the live published URL | All icon-only buttons labeled, semantic HTML, RTL-safe, `min-h-dvh` mobile | Run axe-core against the published URL |
| 4 | AI Accuracy graded eval set | Requires customer-supplied ground-truth Q&A pairs | Last live run: 8/8 `sql.read` calls succeeded with no fabrication | Provide 20–30 Q&A pairs for a vitest pass@k harness |
| 5 | Microsoft 365 / SAP / Oracle tenant credentials | Customer-tenant credentials by definition | Adapters implemented and simulated end-to-end; switch is one env-var flip per tenant | Supply tenant credentials per customer |
| 6 | Stripe / Paddle billing | Requires business decision on plan tiers + tax registration | Lead-capture flow and email infrastructure live; billing toggle is one connector call | Decide pricing model, then enable connector |
| 7 | ElevenLabs voice quotas | Vendor SLA / quota | TTS/STT operational against current key | Monitor quota; upgrade plan if needed |

## Decision Rule
None of the above blocks v1.0.0 GA. They are configuration/measurement items handled at deployment or operator time, not engineering defects to fix in code.
