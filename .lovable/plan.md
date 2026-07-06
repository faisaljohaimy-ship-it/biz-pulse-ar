# خطة التنفيذ الكاملة — Entra ID × ARIA × Microsoft 365 × SAP × Enterprise DB

## المعمارية المستهدفة

```text
[User Browser]
     │  (Sign-in with Microsoft)
     ▼
[Entra ID / Azure AD] ──OAuth2 Auth Code + PKCE──▶ [/auth/ms/callback]
     │                                                     │
     │                                              exchange code
     ▼                                                     ▼
[ARIA Orchestrator] ◀── delegated user token ── [ms_user_tokens (RLS, encrypted)]
     │
     ├─▶ Microsoft Graph  (Outlook / Teams / SharePoint / OneDrive / Calendar)
     ├─▶ SAP Gateway      (OData v2/v4 via SAP_BASE_URL + service user)
     └─▶ Supabase (Enterprise DB)  — sec_*, integration_*, ms_*, sap_* tables
```

## المكوّنات المضافة

1. **مصادقة Entra (Per-user OAuth Delegated)**
   - تسجيل تطبيق في Entra بصلاحيات: `openid profile email offline_access User.Read Mail.Read Mail.Send Calendars.ReadWrite Files.ReadWrite.All Sites.Read.All ChannelMessage.Send Channel.ReadBasic.All`.
   - Route عام: `/auth/ms/start` → يبني رابط `authorize` مع PKCE و state.
   - Route عام: `/auth/ms/callback` → يبادل الكود بالتوكن ويخزّنه.
   - جدول `ms_user_tokens` (user_id, tenant_id, access_token, refresh_token, expires_at, scope) مع RLS صارم (المستخدم يقرأ سجله فقط، الكتابة service_role فقط).
   - مُحدِّث خلفي `refreshMsToken(userId)` server-fn يعيد التوكن قبل انتهائه.

2. **Graph Client موحّد** — `src/lib/ms/graph.server.ts`
   - `graphFetch(userId, path, init)` يحقن التوكن ويتعامل مع 401/refresh وrate-limit.
   - Server-fns مُغلّفة بـ `requireSupabaseAuth`:
     - `listOutlookMessages`, `sendOutlookMail`
     - `listTeamsChannels`, `postTeamsMessage`
     - `listSharePointSites`, `listSiteFiles`, `uploadSiteFile`
     - `listCalendarEvents`, `createCalendarEvent`

3. **جسر SAP** — `src/lib/sap/client.server.ts`
   - HTTP client يستخدم `SAP_BASE_URL` + `SAP_CLIENT_ID` + `SAP_CLIENT_SECRET` (OAuth2 client credentials عبر SAP BTP) أو Basic حسب البيئة.
   - Server-fns: `sapListBusinessPartners`, `sapListSalesOrders`, `sapGetMaterial`, `sapExecute(entity, query)` عام مع validator.
   - جدول `sap_sync_log` لحفظ نتائج المزامنة.

4. **تكامل ARIA**
   - أدوات جديدة في `src/lib/aria/tools/`:
     `ms.outlook.read`, `ms.outlook.send`, `ms.teams.post`, `ms.sharepoint.search`, `ms.calendar.next`, `sap.query`, `sap.orders.list`.
   - تُسجَّل في `tool_registry` وتُستدعى عبر orchestrator الموجود؛ التنفيذ يمرّ بـ `authenticate` (Phase 9.3) ويستخدم توكن المستخدم الحالي.
   - ARIA تستطيع الآن الإجابة على: "اقرأ آخر بريد لي"، "أرسل تحديث للفريق"، "أعطني آخر أوامر البيع من SAP".

5. **واجهة الإدارة** — `/integrations/microsoft` و`/integrations/sap`
   - زر "Connect Microsoft" (يبدأ OAuth)، حالة الاتصال، آخر مزامنة، الصلاحيات الممنوحة، فصل الاتصال (revoke + delete token).
   - إعدادات SAP: base URL، اختبار الاتصال، سجل آخر عمليات.

6. **قاعدة البيانات (Migration واحدة)**
   - `ms_user_tokens` (RLS: user_id = auth.uid() للقراءة؛ الكتابة service_role).
   - `sap_connections` (org_id, base_url, auth_mode, service_user_ref) — RLS org-scoped عبر `has_org_role`.
   - `sap_sync_log`, `ms_activity_log` — للتدقيق.
   - GRANTs كاملة + سياسات + triggers لـ `updated_at`.

7. **الأسرار المطلوبة**
   - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `MICROSOFT_REDIRECT_URI`.
   - `SAP_BASE_URL`, `SAP_CLIENT_ID`, `SAP_CLIENT_SECRET` (أو `SAP_USERNAME`/`SAP_PASSWORD`).
   - `MS_TOKEN_ENCRYPTION_KEY` (يُولَّد تلقائياً 64ch).

## بروتوكول التنفيذ (مراحل قابلة للتحقق)

1. **DB Migration** — إنشاء الجداول والسياسات (خطوة واحدة، انتظار الموافقة).
2. **الأسرار** — طلب أسرار Microsoft وSAP من المستخدم عبر `add_secret`، وتوليد مفتاح التشفير.
3. **Entra OAuth flow** — routes `/auth/ms/start`, `/auth/ms/callback`, tokens store + refresh helper.
4. **Graph server-fns + UI Microsoft integration page** (اختبار حي بجلب inbox).
5. **SAP client + server-fns + UI SAP integration page** (اختبار GET على `$metadata`).
6. **ربط ARIA (tools + registry)** واختبار جملة عربية end-to-end.
7. **Playwright**: مسارات OAuth (mock)، جلب بريد، إرسال Teams، استعلام SAP.
8. **Typecheck + مراجعة أمنية** (RLS scanner) + تحديث `AI_ARCHITECTURE.md`.

## تفاصيل تقنية

- كل التوكنات مشفّرة AES-256-GCM باستخدام `MS_TOKEN_ENCRYPTION_KEY` قبل الإدراج.
- `refresh` يتم تلقائياً إذا `expires_at - now() < 120s`.
- كل طلب Graph يمرّ عبر `httpFetch` الموجود (retries + timeouts).
- SAP يستخدم نفس نمط `httpFetch` مع CSRF token fetch للطرق غير الآمنة.
- لا يوجد أي service-role في متصفح؛ التوكن لا يُعاد للواجهة، فقط النتائج.
- كل استدعاءات ARIA تُسجَّل في `tool_executions` (موجود).

## معايير القبول

- تسجيل دخول Microsoft يعمل ويخزّن التوكن مشفراً.
- صفحة `/integrations/microsoft` تُظهر الحالة والصلاحيات، وتعرض آخر 10 رسائل inbox حياً.
- إرسال رسالة Teams من ARIA بأمر عربي.
- استعلام SAP يرجع بيانات فعلية أو خطأ واضح مع معرّف السجل في `sap_sync_log`.
- Typecheck نظيف، لا تحذيرات RLS جديدة، ولا أسرار في الواجهة.

هل أبدأ بالمرحلة 1 (Migration) الآن؟
