# Implementation Plan: Authorized asset QR read pilot

**Branch**: `feature/sadeed-authorized-asset-qr-20261123` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

## Summary

Reuse the existing dashboard AlertsPanel, `requireSupabaseAuth`, caller-JWT Supabase client and installed `react-qr-code`. Add an exact UUID read and singular route; keep the hidden `/sec/assets` route untouched.

The server success includes its verified caller identity. The client checks it against the captured account before returning data to the user-keyed query and again before rendering. Query cancellation and a 15-second whole-promise deadline share an AbortController passed through the installed serverFn signal option. The race bounds pending UI even while the unchanged global auth-attacher awaits a session; late transport serialization observes the aborted signal. Timers/listeners are removed in `finally`. No change to authentication middleware is made.

## Technical Context

React/TypeScript, TanStack Start/Router/Query, existing Supabase RLS. No dependencies or database changes. The metadata-only audit of the active project found `sec_assets.org_id NOT NULL`, admin/member read policies and a nullable site/circle/region chain. Region is not an authorization predicate. The source audit is not a live role-isolation test.

## Constitution Check

Preserve image/media work, auth policies, hidden routes and database permissions. No fabricated records or timestamps. Static source/route generation only under the current owner waiver; no optional test suites, CI, account impersonation or business-row exports.

## Project Structure

- `src/lib/sec/asset-detail.functions.ts`: validated private real-row read and safe outcomes.
- `src/routes/_authenticated/sec.asset.$assetId.tsx`: account-bound/error-first online detail and QR.
- `src/components/sec/alerts-panel.tsx`: contextual entry only for existing real UUID rows.
- Existing screen/narration registry and generated route tree: canonical reachable route.

## Verification and Limits

Use the installed Spec Kit helper in dry-run mode and its spec/plan structure, preserving the requested branch name. Generate the route tree using the installed router generator. Record static checks actually performed. Authentication, cross-organization denial, record freshness and QR scanning remain runtime acceptance requirements until observed with authorized accounts; no media-batch delay or deployment is authorized here.

Observed static checks: `tsc --noEmit` exited 0; ESLint over the five new/changed non-generated TypeScript source files exited 0 without warnings. Route generation retained the existing framework registration footer. No tests, app server, production build, CI, live business-row queries, role impersonation, commit, push or deployment were performed. Cache-header behavior and compiled client/server isolation have not yet been verified by a build or runtime request.

Sanitized metadata evidence is retained locally at `/tmp/sadeed-feature12-schema-audit.json`: the active project has `org_id NOT NULL` and current admin-plus-organization membership policies, not the historical allow-all SELECT policy. This evidence contains schema/policy/function definitions only, not records or credentials.
