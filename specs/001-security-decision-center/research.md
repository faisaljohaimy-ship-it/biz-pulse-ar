# Design decisions

- **Reuse fixture**: Extend `buildUnauthorizedAccessDecisionDemo()` instead of inventing another event. Preserve existing Arabic fields and add English counterparts and synthetic evidence.
- **Local guarded interaction**: Pure transitions plus component state make progression reproducible and distinguish review from operational approval. Live AI, server functions, and writes are excluded.
- **Section integration**: Use `/sec/decision-center`, section subnavigation, and a landing card; preserve fixed main navigation. `/security-center` serves distinct access administration.
- **Shared preferences**: Reuse locale/theme; scope direction because the security parent currently sets RTL.
- **Staff attribution boundary**: Browser verification found the shared staff-number overlay blocked the fictional demonstration. Exempt only the exact synthetic path and one trailing slash via `isSecurityDecisionDemoRoute()` in `__root.tsx`; retain neighboring operational gates and noindex. Do not submit invented staff details to pass the overlay.
- **Touch targets**: Browser measurement showed rem-based controls were 40px under the app root size; use literal 44px primary targets.
- **Preview**: Existing Vercel integration supports feature previews. Verify final commit metadata; prior deployment success does not prove the new revision.

No unresolved design clarification blocks this demonstration.
