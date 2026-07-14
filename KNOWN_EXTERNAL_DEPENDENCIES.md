# NEXIOS AI OS — External release gates

These items cannot be proven from a source archive. They are required before a
production launch can be called complete.

| Gate | Required evidence |
|---|---|
| Supabase target | Apply all migrations, verify RLS with two tenants, and confirm service-role isolation |
| Cloudflare target | Account ID, scoped API token, Worker runtime secrets, routes, and custom-domain binding |
| Auth E2E | Public Supabase values plus a dedicated non-production E2E user |
| AI and voice | Approved provider keys, quotas, data-retention terms, and a live failure/fallback exercise |
| Enterprise connectors | Customer Microsoft/Power BI/SAP credentials and a successful least-privilege connection test |
| LiveAvatar | Implement and review the supported HeyGen LiveAvatar client before enabling vendor token minting |
| Disaster recovery | Automated backup policy plus a timed restore exercise |
| Performance/accessibility | Lighthouse and axe runs against the deployed URL on desktop and mobile |
| Operations | Alert routing, on-call ownership, log retention, and incident-response approval |

The application falls back safely when optional integrations are absent, but
missing deployment, database, or recovery evidence blocks a production sign-off.
