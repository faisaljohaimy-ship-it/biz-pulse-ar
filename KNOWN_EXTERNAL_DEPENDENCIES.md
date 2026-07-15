# NEXIOS AI OS — External release gates

These items cannot be proven from a source archive. They are required before a
production launch can be called complete.

| Gate                      | Required evidence                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Supabase target           | Apply all migrations, verify RLS with two tenants, and confirm service-role isolation                        |
| Cloudflare target         | Account ID, scoped API token, Worker runtime secrets, routes, and custom-domain binding                      |
| Auth E2E                  | Public Supabase values plus a dedicated non-production E2E user                                              |
| AI and voice              | Approved provider keys, quotas, data-retention terms, and a live failure/fallback exercise                   |
| ARIA outbound messaging   | Verified Outlook/Resend sender, Twilio sender/Messaging Service, test recipients, and live delivery evidence |
| Enterprise connectors     | Customer Microsoft/Power BI/SAP credentials and a successful least-privilege connection test                 |
| LiveAvatar                | Implement and review the supported HeyGen LiveAvatar client before enabling vendor token minting             |
| Disaster recovery         | Automated backup policy plus a timed restore exercise                                                        |
| Performance/accessibility | Lighthouse and axe runs against the deployed URL on desktop and mobile                                       |
| Operations                | Alert routing, on-call ownership, log retention, and incident-response approval                              |

The application falls back safely when optional integrations are absent, but
missing deployment, database, or recovery evidence blocks a production sign-off.

# ضوابط الإطلاق المضافة في v1.3

- رسائل ARIA لا تُرسل من أداة الذكاء مباشرة. يلزم تطبيق migration
  `20260715190000_aria_outbound_approval_ledger.sql` وضبط
  `ARIA_MESSAGE_APPROVAL_SECRET` قبل تفعيل البريد أو SMS.
- لتتبّع التسليم: سجل عنوان Twilio الموجود في `TWILIO_STATUS_CALLBACK_URL`،
  وسجل `/api/public/hooks/resend-message-status` في Resend ثم اضبط
  `RESEND_WEBHOOK_SECRET`. Outlook يثبت قبول الطلب فقط ولا يقدّم delivery
  webhook عبر connector الحالي.
- بوابة PDPL تفشل مغلقة حتى تُعبأ متغيرات `PDPL_*` الفعلية ويحفظ
  `PDPL_LEGAL_APPROVAL_REF`. لا توجد قيم قانونية افتراضية في الكود.
