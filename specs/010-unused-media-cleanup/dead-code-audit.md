# Unused dependency and source audit — 2026-11-24

This continues the owner's request to remove unused repository/system files and
publish directly without CI. Knip is a candidate inventory, not deletion proof:
shell entry points, CSS imports, string imports, source-reading tests and protected
files were checked separately. No protected build configuration, authorization,
database, provider configuration or live media was changed by this audit.

## Removed source

| File                                         |  Bytes | Evidence                                                                                                                                                                                                                                 |
| -------------------------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/RegionSwitcher.tsx`          |  4,760 | No import, lazy import, runtime registry or script consumer. Remaining references are explanatory comments about the canonical region icon.                                                                                              |
| `src/components/home/CommandRoomScreens.tsx` |  2,452 | No consumer after the owner's screen-motion removal. Existing home contract asserts absence of `.command-room-screens`.                                                                                                                  |
| `src/styles/home/command-room-screens.css`   |  1,272 | Imported only by the removed component; no independent stylesheet import.                                                                                                                                                                |
| `src/components/reports/charts/index.ts`     |  1,366 | Unused export barrel; report-chart consumers use individual modules. The source-reading chart contract enumerates existing non-test files and does not require this barrel. Individual chart modules and tests remain.                   |
| `src/lib/reports/deck.ts`                    | 31,419 | No caller/import or external source-reading test for its exports (`buildReportDeck`, `DeckOptions`, `chartImageUri`, `formatDeckValue`, `paginateSection`, `svgToDataUri`, `isEmbeddedImage`). Current report PDF/export engines remain. |

Total source removed: **41,269 bytes**. Whole-repository searches included source,
scripts, tests, agent/tooling configuration and historical docs. Historical
descriptions remain historical; they are not promises that removed components
are active. No JavaScript payload reduction is claimed for code already unreachable
from the application graph.

## Removed dependencies

The actual standalone `vite.config.ts` imports its plugins directly and never
invokes the following build wrappers/tagger. The existing
`src/test/standalone-build.contract.test.ts` verifies that build ownership.

- Dev: `@lovable.dev/vite-plugin-dev-server-bridge`,
  `@lovable.dev/vite-plugin-hmr-gate`, `@lovable.dev/vite-tanstack-config`,
  `lovable-tagger`.
- Runtime: `jspdf`; no executable source/script/test consumer remains. Current
  report generation uses the established PDF engine instead.

Changed only `package.json` and `package-lock.json` using:

```sh
npm uninstall --package-lock-only --ignore-scripts --cache /tmp/sadeed-npm-cache \
  @lovable.dev/vite-plugin-dev-server-bridge \
  @lovable.dev/vite-plugin-hmr-gate \
  @lovable.dev/vite-tanstack-config lovable-tagger jspdf
```

Lock package entries decreased **1,340 → 1,249** (91 removed, no added packages).
No retained package version, resolution, integrity or dependency range changed.
Twenty retained optional/native package entries changed only their `dev` metadata
as npm recomputed reachability. The root lock declarations match the five removals.

Before pruning the installed tree, the exclusive removed directories present on
this Linux host contained **52,937,292 logical file bytes**. This is a prospective
local installed-file saving, not a cross-platform tarball/download estimate or
proof that the directories have already been removed. Removed lock entries also
include platform packages not installed here. A fresh install/prune and final
build/type/lint/test/security gates are owned by the integrating release task.

## False positives retained

- `mammoth`: used by dynamic string imports of `mammoth/mammoth.browser` in
  `knowledge-upload` and `sadeed-documents`.
- `tailwindcss`, `tw-animate-css`: imported by `src/styles.css`.
- `streamdown`: application rendering no longer imports it, but `npm explain
remark-gfm` proves it currently supplies the undeclared `remark-gfm` import
  consumed by FinnMarkdown/Copilot. Removing it without first making that dependency
  explicit could break clean installs. No unrelated dependency rework is included.
- `drizzle-orm` and `@tanstack/router-plugin`: preserve the existing migration/build
  toolchain rather than treating an import-only scan as proof of disuse.
- `offline-measure.main.server.ts`: explicit esbuild entry in `scripts/rag-measure.sh`.
- `RegionTwinScene.tsx`: `scripts/twin-preview.mjs` and a source-reading contract use it.
- `InstrumentPanels.tsx`: blueprint source-reading contract uses it.
- `DecisionEngine.tsx`: preserved by the explicit existing owner/coordination rule.
- Alerts/learning files: no source deletion; learning injector is named in protected
  self-evolution paths and engineering governance. No authority/endpoint cleanup is
  inferred from Knip output.

## Acceptance boundary

Focused and aggregate checks after these edits belong to the final integrated
revision. This inventory does not mark a pending check green or establish a
runtime latency improvement. The media cleanup manifest and deployment receipt
record their separate measured storage and release outcomes.
