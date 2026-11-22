# Validation guide

Use Node 22–24 and the existing npm lockfile from the repository root:

```sh
npm ci
npm run check
npm run dev
```

Open `/sec/decision-center` and `/sec/decision-center/` as a guest without entering staff information. Confirm neighboring operational routes retain their staff gate and the demo remains noindex. Inspect the simulation disclosure/scenario, advance to review, try each simulated outcome on separate runs, and reset. Confirm that no operational approval is claimed. Switch language mid-flow and confirm the stage remains.

Inspect Arabic/English in dark/light at 360, 390, 430, 768, and 1280px: no horizontal overflow, readable labels, keyboard focus, and primary controls at least 44px. Confirm section navigation and landing card open the route.

After final feature push, verify the matching Vercel Preview commit/status and route. Record actual results in `tasks.md` or linked delivery evidence; a prior Preview is not proof of the final revision.
