# SADEED and FNN owner dashboard

The homepage retains its existing map, SADEED panel, indicators and operational rows. An additional owner-only section opens the existing SADEED chat, the single independent FNN dialog, or `/orchestration`. The actual system sidebar now includes the shared workspace for the verified owner only. Each chat has its own lazy-loading boundary so a suspended SADEED component does not delay the FNN dialog.

## Roles and current capabilities

- SADEED: digital leadership, operational analysis, agent coordination and outcome review through the existing assistant.
- FNN: independent, deterministic engineering and ingestion planning. Its authenticated execution adapter supports only `sql.read`, `sec.create_incident` and `sec.update_work_order`. Registry-disabled tools remain unavailable; mutations require the existing approval flow. Arbitrary code execution, repository writes and deployment are not implemented in FNN.
- Opening either chat does not run an operational tool, enable agents, or change the migration destination.

## Owner configuration

Configure the server environment before expecting the owner card or FNN icon to appear:

| Variable            | Value / behavior                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `FNN_OWNER_USER_ID` | `0e48b528-26f5-4529-a1bf-aa644bbd3525`, the explicitly approved owner identity               |
| `FNN_OWNER_EMAIL`   | `faisaljohaimy@gmail.com`, optional confirmed-email bootstrap when no owner ID is configured |

These are server variables, never `VITE_` variables. The configured ID takes precedence. Every privileged request revalidates the user through Supabase Auth. Missing configuration fails closed; admin membership or editable user metadata never substitutes for ownership. No production environment was changed by this patch.

## Validation and release limits

UI integration tests exercise both chat entry points, one FNN dialog, non-owner rejection, identity changes, permission revocation and English direction. Existing server tests cover owner validation, tenant scope and disabled-tool enforcement.

An isolated browser fixture exercises the real UI components at 390 and 1280 pixels in light and dark themes, including opening the existing dialog and rendering a mocked FNN plan. The identity and transport are mocked: this proves layout and wiring, not authenticated production behavior. The fixture exposed global pointer rules overriding utility button heights; scoped logical minimum sizes now preserve 44-pixel controls without changing the shared button component. A deliberately removed owner guard made the rejection test fail; the original source was restored and the tests passed again.

The lockfile updates Vite from 7.3.5 to 7.3.7 within its existing package range to address the high-severity audit finding. No dependency was added to the application; Chromium used for local test checks is an external test-runtime artifact. Low/moderate advisories in unrelated dependencies remain; no forced Mammoth downgrade was applied.

The live project metadata still points to `e21bea0b7f06c07ec6acb32372890e3a2b67ec98`; inherited dual-agent work and this patch are not verified as published there. This patch is stacked on `codex/fnn-owner-regional-news-2026-10-20` so it does not overwrite that work.

Real owner sign-in and authenticated browser verification remain release requirements. The destination database is still quarantined, its RLS policies/privileges are incomplete, independent Google OAuth is incomplete, and no production database cutover is authorized before final synchronization and tests. Keep agents, tools and scheduled workflows disabled throughout that process.
