# E12 / 007 — Independent source review, 2026-11-24

This is a read-only review of the existing source at the active candidate, not a
live role/tenant exercise or a new production record read. No application code,
schema, role or provider was changed by this review.

| Boundary            | Observed source evidence                                                                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry               | `src/components/sec/alerts-panel.tsx` offers singular detail only for an existing signed-in, valid-UUID, non-simulation asset row; alert query is account-keyed                                                         |
| Server              | `src/lib/sec/asset-detail.functions.ts` uses outer private/no-store middleware, `requireSupabaseAuth`, strict UUID input, current `has_role(admin)` and the caller-scoped client; no service-role/optional-auth read    |
| Record              | Exact `sec_assets.id` filter, explicit columns, limit1, bounded admin/read queries and schema validation; missing/forbidden/source failure do not return asset data or disclose an inaccessible row                     |
| Identity            | Success returns the verified caller ID. The client checks it before returning query data and again before rendering                                                                                                     |
| Lifetime            | `sec.asset.$assetId.tsx` remounts for account/record changes, keys query by user/record, uses gcTime0/no retry, hides data during fetch/error/offline and bounds the entire auth/transport promise with a15s abort race |
| QR                  | Display requires a current successful authorized record, then an explicit QR toggle; URL contains only same-origin singular record ID, never a session/token. Opening the link reuses the protected read                |
| Honesty             | Source update/contact times are distinct from fetch time; the page states that fetch/sync do not establish freshness or current connectivity. No offline access/cache is claimed                                        |
| Existing navigation | Generated route tree contains `/sec/asset/$assetId`; legacy `/sec/assets` still redirects to `/sec` under its original hidden-screen decision                                                                           |

No source-level blocker was found in these reviewed paths. This closes009T033's
independent source review, not007's operational acceptance. A real permitted/denied
account/org/record read, account-switch/refetch behavior and actual QR scan still
need the authorized G-AUTH session/data and observed runtime result. Source review
does not prove actual deployed response-cache headers, DB policy behavior, device
camera behavior or a complete cross-tenant security exercise. Final build and
production checks remain root-owned.
