import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";

export type IntegrationStatus = {
  id: string;
  label: string;
  category: "erp" | "productivity" | "identity" | "bi" | "ai" | "data" | "automation" | "api";
  status: "not_configured" | "configured" | "error";
  scopes: string[];
  doc: string;
  note: string;
  /** Present on reference-simulation rows (and future live sync metadata). */
  last_sync_at?: string | null;
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
    status: "not_configured",
    scopes: ["Mail.Send", "Sites.ReadWrite.All", "ChannelMessage.Send"],
    doc: "Microsoft Graph عبر موصّل Lovable",
    note: "متصل عبر Outlook/SharePoint/Teams — يُستخدم في التقارير التنفيذية.",
  },
  {
    id: "sharepoint",
    label: "SharePoint",
    category: "productivity",
    status: "not_configured",
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
    status: "not_configured",
    scopes: ["chat.completions"],
    doc: "OPENROUTER_API_KEY",
    note: "متصل — موجّه احتياطي للنماذج.",
  },
  {
    id: "lovable_ai",
    label: "Lovable AI Gateway",
    category: "ai",
    status: "not_configured",
    scopes: ["chat.completions", "image.generate", "tts"],
    doc: "LOVABLE_API_KEY (مُدار)",
    note: "متصل — المحرك الافتراضي لـ ARIA.",
  },
  {
    id: "supabase",
    label: "Supabase (Lovable Cloud)",
    category: "data",
    status: "not_configured",
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

function hasEnv(...names: string[]): boolean {
  return names.every((name) => Boolean(process.env[name]?.trim()));
}

function isProviderConfigured(id: string): boolean {
  switch (id) {
    case "sap":
      return hasEnv("SAP_BASE_URL", "SAP_CLIENT_ID", "SAP_CLIENT_SECRET");
    case "m365":
      return Boolean(
        process.env.MICROSOFT_OUTLOOK_API_KEY ||
        process.env.MICROSOFT_ONEDRIVE_API_KEY ||
        process.env.MICROSOFT_SHAREPOINT_API_KEY ||
        process.env.MICROSOFT_TEAMS_API_KEY,
      );
    case "sharepoint":
      return hasEnv("MICROSOFT_SHAREPOINT_API_KEY");
    case "azure_ad":
      return hasEnv("MICROSOFT_TENANT_ID", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET");
    case "power_bi":
      return hasEnv(
        "POWERBI_TENANT_ID",
        "POWERBI_CLIENT_ID",
        "POWERBI_CLIENT_SECRET",
        "POWERBI_WORKSPACE_ID",
      );
    case "openrouter":
      return hasEnv("OPENROUTER_API_KEY");
    case "lovable_ai":
      return hasEnv("LOVABLE_API_KEY");
    case "supabase":
      return Boolean(
        (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
        (process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.VITE_SUPABASE_ANON_KEY),
      );
    case "n8n":
      return hasEnv("N8N_WEBHOOK_URL", "N8N_TOKEN");
    case "rest":
      return hasEnv("GENERIC_REST_BASE_URL", "GENERIC_REST_TOKEN");
    default:
      return false;
  }
}

export const listIntegrations = createServerFn({ method: "GET" })
  // Open showcase read (env-derived, no database): when NOTHING is
  // configured (pure showcase deployment) the rich reference-simulation
  // connector set fills the window — real env configuration always wins.
  .middleware([optionalSupabaseAuth])
  .handler(async (): Promise<IntegrationStatus[]> => {
    const live = PROVIDERS.map((provider) => {
      const configured = isProviderConfigured(provider.id);
      return {
        ...provider,
        status: configured ? ("configured" as const) : ("not_configured" as const),
        note: configured
          ? provider.note.replace(/^Disabled —\s*/i, "")
          : `غير متصل — ${provider.doc}`,
      };
    });
    // Platform plumbing (supabase/lovable_ai/openrouter) is configured on
    // every deployment — only EXTERNAL enterprise connectors count as real
    // configuration for showcase purposes.
    const PLUMBING = new Set(["supabase", "lovable_ai", "openrouter"]);
    const hasExternal = live.some((p) => p.status === "configured" && !PLUMBING.has(p.id));
    if (hasExternal) return live;
    const { buildConnectorsSimulation } = await import("@/lib/exec/showcase-simulation.server");
    return buildConnectorsSimulation(Date.now()) as unknown as IntegrationStatus[];
  });
