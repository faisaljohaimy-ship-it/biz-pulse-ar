import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntegrationStatus = {
  id: string;
  label: string;
  category: "erp" | "productivity" | "identity" | "bi" | "ai" | "data" | "automation" | "api";
  status: "not_configured" | "configured" | "error";
  scopes: string[];
  doc: string;
  note: string;
};

const PROVIDERS: IntegrationStatus[] = [
  {
    id: "sap",
    label: "SAP S/4HANA",
    category: "erp",
    status: "not_configured",
    scopes: ["assets.read", "workorders.read"],
    doc: "OData v4 endpoint + OAuth2 client credentials",
    note: "Disabled — لم يتم ربط SAP بعد. عند التفعيل: مزامنة الأصول وأوامر العمل.",
  },
  {
    id: "m365",
    label: "Microsoft 365",
    category: "productivity",
    status: "configured",
    scopes: ["Mail.Send", "Sites.ReadWrite.All", "ChannelMessage.Send"],
    doc: "Microsoft Graph عبر موصّل Lovable",
    note: "متصل عبر Outlook/SharePoint/Teams — يُستخدم في التقارير التنفيذية.",
  },
  {
    id: "sharepoint",
    label: "SharePoint",
    category: "productivity",
    status: "configured",
    scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All"],
    doc: "Graph Sites/Drives API",
    note: "متصل — نشر تقارير PDF تنفيذية.",
  },
  {
    id: "azure_ad",
    label: "Azure AD",
    category: "identity",
    status: "not_configured",
    scopes: ["User.Read.All", "Group.Read.All"],
    doc: "Graph Users/Groups + SSO SAML",
    note: "Disabled — تسجيل دخول موحّد. عند التفعيل: مزامنة الموظفين والصلاحيات.",
  },
  {
    id: "power_bi",
    label: "Power BI",
    category: "bi",
    status: "not_configured",
    scopes: ["Dataset.Read.All", "Report.Read.All"],
    doc: "Power BI REST API + Embed token",
    note: "Disabled — تضمين لوحات بيانات تنفيذية.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    category: "ai",
    status: "configured",
    scopes: ["chat.completions"],
    doc: "OPENROUTER_API_KEY",
    note: "متصل — موجّه احتياطي للنماذج.",
  },
  {
    id: "lovable_ai",
    label: "Lovable AI Gateway",
    category: "ai",
    status: "configured",
    scopes: ["chat.completions", "image.generate", "tts"],
    doc: "LOVABLE_API_KEY (مُدار)",
    note: "متصل — المحرك الافتراضي لـ ARIA.",
  },
  {
    id: "supabase",
    label: "Supabase (Lovable Cloud)",
    category: "data",
    status: "configured",
    scopes: ["postgrest", "auth", "storage", "realtime"],
    doc: "Managed",
    note: "متصل — قاعدة البيانات الأساسية.",
  },
  {
    id: "n8n",
    label: "n8n",
    category: "automation",
    status: "not_configured",
    scopes: ["workflow.trigger"],
    doc: "Webhook URL + token",
    note: "Disabled — أتمتة سير العمل. عند التفعيل: تشغيل سيناريوهات استجابة.",
  },
  {
    id: "rest",
    label: "REST APIs (Generic)",
    category: "api",
    status: "not_configured",
    scopes: ["custom"],
    doc: "HTTP(S) + Bearer/HMAC",
    note: "Disabled — اتصال مخصّص بأنظمة طرف ثالث.",
  },
];

export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<IntegrationStatus[]> => PROVIDERS);
