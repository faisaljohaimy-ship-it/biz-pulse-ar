// Auto-split from executive-reports.tsx — Error Card preview mock scenarios (data).
import type { PublishErrorEnvelope } from "@/lib/exec-reports.functions";

// ─── Mock scenarios for Error Card preview (no Graph call) ────────────────
export type MockScenario = {
  key: string;
  label_en: string;
  label_ar: string;
  build: () => Omit<PublishErrorEnvelope, "__publishError" | "requestId">;
};
export const MOCK_SCENARIOS: MockScenario[] = [
  {
    key: "sp_401",
    label_en: "SharePoint 401 — unauthorized",
    label_ar: "SharePoint 401 — غير مصرّح",
    build: () => ({
      stage: "sharepoint_upload",
      status: 401,
      code: "unauthorized",
      message_en: "Microsoft 365 connection rejected the request (401).",
      message_ar: "رفض اتصال Microsoft 365 الطلب (401).",
      hint_en:
        "Reconnect the Microsoft connector (SharePoint/Teams) from Project → Connectors and try again.",
      hint_ar: "أعد توصيل موصّل Microsoft (SharePoint/Teams) من إعدادات المشروع ثم أعد المحاولة.",
      raw: '{"error":{"code":"unauthorized","message":"Access token is invalid or expired."}}',
    }),
  },
  {
    key: "sp_403",
    label_en: "SharePoint 403 — accessDenied",
    label_ar: "SharePoint 403 — صلاحية مرفوضة",
    build: () => ({
      stage: "sharepoint_upload",
      status: 403,
      code: "accessDenied",
      message_en: "Permission denied on this SharePoint site.",
      message_ar: "صلاحية غير كافية على موقع SharePoint هذا.",
      hint_en:
        "The connected Microsoft account needs Edit/Contribute permission on the chosen site (Sites.ReadWrite.All scope).",
      hint_ar:
        "يحتاج حساب Microsoft الموصّل صلاحية Edit/Contribute على الموقع المختار (Sites.ReadWrite.All).",
      raw: '{"error":{"code":"accessDenied","message":"Either scope or roles allowing to perform the requested operation are absent."}}',
    }),
  },
  {
    key: "sp_404",
    label_en: "SharePoint 404 — itemNotFound",
    label_ar: "SharePoint 404 — غير موجود",
    build: () => ({
      stage: "sharepoint_upload",
      status: 404,
      code: "itemNotFound",
      message_en: "SharePoint site or folder not found.",
      message_ar: "لم يتم العثور على موقع SharePoint أو المجلد.",
      hint_en: "Refresh the list and pick a destination the connected account still has access to.",
      hint_ar: "حدّث القائمة واختر وجهة لا يزال الحساب الموصّل يملك صلاحية الوصول إليها.",
      raw: '{"error":{"code":"itemNotFound","message":"The resource could not be found."}}',
    }),
  },
  {
    key: "sp_link_403",
    label_en: "SharePoint createLink 403",
    label_ar: "إنشاء رابط SharePoint 403",
    build: () => ({
      stage: "sharepoint_createLink",
      status: 403,
      code: "accessDenied",
      message_en: "Permission denied on this SharePoint site.",
      message_ar: "صلاحية غير كافية على موقع SharePoint هذا.",
      hint_en:
        "Tenant sharing policy blocks creating organization links. The webUrl fallback will be used.",
      hint_ar:
        "سياسة المشاركة في المؤسسة تمنع إنشاء روابط على مستوى المنظمة. سيُستخدم رابط webUrl البديل.",
      raw: '{"error":{"code":"accessDenied","message":"Tenant admin disabled organization sharing links."}}',
    }),
  },
  {
    key: "validation",
    label_en: "Validation — title too long",
    label_ar: "تحقق — العنوان طويل",
    build: () => ({
      stage: "validation",
      message_en: "Invalid title.",
      message_ar: "العنوان غير صالح.",
      hint_en: "Title must be 1–240 characters.",
      hint_ar: "يجب أن يكون العنوان بين 1 و240 حرفاً.",
    }),
  },
  {
    key: "teams_403",
    label_en: "Teams 403 — partial success",
    label_ar: "Teams 403 — نجاح جزئي",
    build: () => ({
      stage: "teams_post",
      status: 403,
      code: "Forbidden",
      message_en: "Report uploaded to SharePoint, but posting to Teams failed.",
      message_ar: "تم رفع التقرير إلى SharePoint، لكن فشل النشر إلى Teams.",
      hint_en: "The connected account isn't a member of this team or lacks ChannelMessage.Send.",
      hint_ar: "الحساب الموصّل ليس عضواً في هذا الفريق أو يفتقر لصلاحية ChannelMessage.Send.",
      raw: JSON.stringify({
        sharepointUrl:
          "https://sharepoint.example.invalid/sites/exec/Shared%20Documents/NEXIOS%20Reports/simulation-report.html",
        providerRaw:
          '{"error":{"code":"Forbidden","message":"Caller is not a member of the team."}}',
      }),
    }),
  },
  {
    key: "teams_404",
    label_en: "Teams 404 — channel not found",
    label_ar: "Teams 404 — القناة غير موجودة",
    build: () => ({
      stage: "teams_post",
      status: 404,
      code: "itemNotFound",
      message_en: "Report uploaded to SharePoint, but posting to Teams failed.",
      message_ar: "تم رفع التقرير إلى SharePoint، لكن فشل النشر إلى Teams.",
      hint_en: "The selected Teams channel was deleted or renamed. Pick another channel.",
      hint_ar: "قناة Teams المختارة تم حذفها أو تغيير اسمها. اختر قناة أخرى.",
      raw: JSON.stringify({
        sharepointUrl:
          "https://sharepoint.example.invalid/sites/exec/Shared%20Documents/NEXIOS%20Reports/simulation-report.html",
        providerRaw: '{"error":{"code":"itemNotFound","message":"Channel not found."}}',
      }),
    }),
  },
  {
    key: "rate_429",
    label_en: "Graph 429 — rate limited",
    label_ar: "Graph 429 — تجاوز الحد",
    build: () => ({
      stage: "sharepoint_upload",
      status: 429,
      code: "TooManyRequests",
      message_en: "Microsoft Graph rate limit reached.",
      message_ar: "تم بلوغ حد الطلبات في Microsoft Graph.",
      hint_en:
        "Wait a minute and retry — repeated bursts trigger throttling per Microsoft 365 tenant.",
      hint_ar: "انتظر دقيقة ثم أعد المحاولة — تكرار الطلبات السريع يسبب الحد من قبل Microsoft 365.",
      raw: '{"error":{"code":"TooManyRequests","message":"Retry after 60 seconds."}}',
    }),
  },
  {
    key: "server_503",
    label_en: "Graph 503 — service unavailable",
    label_ar: "Graph 503 — الخدمة غير متاحة",
    build: () => ({
      stage: "sharepoint_upload",
      status: 503,
      code: "serverError",
      message_en: "Microsoft Graph is temporarily unavailable.",
      message_ar: "خدمة Microsoft Graph غير متاحة مؤقتاً.",
      hint_en:
        "Retry in a few seconds. If it persists, check the Microsoft 365 service health dashboard.",
      hint_ar: "أعد المحاولة بعد ثوانٍ. إذا استمر، راجع لوحة حالة خدمة Microsoft 365.",
      raw: '{"error":{"code":"serviceNotAvailable","message":"Service is temporarily unavailable."}}',
    }),
  },
];
