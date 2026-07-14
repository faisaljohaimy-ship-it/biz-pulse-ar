# NEXIOS AI OS — Security

## Authentication and authorization

- Public marketing routes remain public; the complete `/_authenticated` route
  tree checks the Supabase session and redirects unauthenticated users to
  `/auth?redirect=…`.
- Sensitive APIs validate the bearer token server-side. Merely supplying an
  `Authorization` header is not sufficient.
- Canonical platform roles are `admin`, `manager`, and `member`.
- Paid voice-token endpoints require `admin` or `manager`; they also fail closed
  when authorization or rate-limit storage is unavailable.
- The deprecated HeyGen browser provider is disabled honestly: no paid vendor
  token is minted until a supported LiveAvatar client is implemented.

## Abuse, privacy, and secrets

- Public lead submissions are limited to five per hour using a SHA-256 digest
  of network context and normalized email.
- Internal lead recipients come only from `LEADS_NOTIFY_EMAIL`; no personal
  recipient address is embedded in source code.
- Unsubscribe errors never log raw tokens, and the production error boundary
  does not expose internal exception messages.
- `.env` and `.env.*` are ignored except `.env.example`. Server secrets must be
  configured in the hosting platform.

## Data and input controls

- Supabase tables created by the migration set have RLS enabled and explicit
  policies. Live policy behavior must still be validated against the selected
  production project after migrations are applied.
- Server functions use typed `.validator(...)` schemas where input is accepted.
- Operational summaries query with the caller's bearer token so RLS applies;
  query failures return a generic error instead of partial data.
- The vulnerable npm `xlsx` release was replaced by the maintained
  `@e965/xlsx` package through an npm alias, preserving imports while removing
  the published advisories.

## Browser and transport hardening

Application responses include HSTS, CSP, `nosniff`, same-origin framing,
strict-origin referrers, permissions policy, COOP, and CORP. The CSP permits the
current HTTPS integrations and inline bootstrap scripts while blocking plugins,
foreign base URLs, and foreign form targets.

The service worker caches same-origin static assets only. It never caches API
responses, authenticated navigations, or managed media endpoints.

## Reporting

Responsible disclosure instructions are published at
`/.well-known/security.txt`. Rotate credentials and review audit events before
sharing logs with third parties.

## Verification boundary

The 2026-07-15 remediation verified typecheck, lint, unit tests, production
build, and npm advisory state locally. It did not claim a live penetration test,
production backup restore, vendor SLA, or production tenant-isolation exercise.
