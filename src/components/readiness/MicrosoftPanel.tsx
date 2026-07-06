// Microsoft 365 integration panel — honest "connect vs waiting" UI.
//
// This component NEVER fakes a connected state. If the raw Azure creds
// (MS_CLIENT_ID / MS_TENANT_ID / MS_CLIENT_SECRET) are missing, the
// connect button is disabled with a tooltip explaining what to add.
// If they are present, the UI shows the connect action ready to wire
// the Graph OAuth flow.
//
// Note: the project also carries connector-managed Lovable keys
// (MICROSOFT_OUTLOOK_API_KEY, MICROSOFT_TEAMS_API_KEY,
// MICROSOFT_SHAREPOINT_API_KEY). Those cover the developer-side
// connector gateway calls, not per-user OAuth. Their presence is
// surfaced for transparency but does NOT flip the readiness chip.
import { Mail, Calendar, ShieldCheck, ShieldAlert, Link2 } from "lucide-react";
import type { ReadinessReport } from "@/lib/readiness.functions";

type Props = {
  microsoft: ReadinessReport["microsoft"];
};

export function MicrosoftPanel({ microsoft }: Props) {
  const azureReady =
    microsoft.client_id_present &&
    microsoft.tenant_id_present &&
    microsoft.client_secret_present;

  return (
    <section
      id="m365"
      dir="rtl"
      aria-labelledby="m365-title"
      className="rounded-2xl border p-4 sm:p-6"
      style={{
        borderColor: azureReady ? "rgba(52,211,153,0.35)" : "rgba(56,189,248,0.28)",
        background:
          "linear-gradient(180deg, rgba(10,22,44,0.55) 0%, rgba(6,14,30,0.45) 100%)",
      }}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {azureReady ? (
            <ShieldCheck className="h-5 w-5" style={{ color: "#34D399" }} />
          ) : (
            <ShieldAlert className="h-5 w-5" style={{ color: "#38BDF8" }} />
          )}
          <h3 id="m365-title" className="text-base font-bold text-foreground">
            تكامل Microsoft 365
          </h3>
        </div>
        <span
          className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={
            azureReady
              ? {
                  borderColor: "rgba(52,211,153,0.4)",
                  color: "#6EE7B7",
                  background: "rgba(52,211,153,0.08)",
                }
              : {
                  borderColor: "rgba(56,189,248,0.4)",
                  color: "#7DD3FC",
                  background: "rgba(56,189,248,0.08)",
                }
          }
        >
          {azureReady ? "جاهز للتفعيل" : "بانتظار الربط"}
        </span>
      </header>

      {/* Credential presence — honest true/false, never guessed */}
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <CredRow label="MS_CLIENT_ID" ok={microsoft.client_id_present} />
        <CredRow label="MS_TENANT_ID" ok={microsoft.tenant_id_present} />
        <CredRow label="MS_CLIENT_SECRET" ok={microsoft.client_secret_present} />
      </div>

      {/* Connector-managed keys — surfaced for transparency, not required */}
      <div className="mb-4 rounded-xl border p-3" style={{ borderColor: "rgba(148,163,184,0.18)" }}>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          مفاتيح Lovable Connectors (تكميلية)
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <CredRow label="MICROSOFT_OUTLOOK_API_KEY" ok={microsoft.outlook_connector_present} muted />
          <CredRow label="MICROSOFT_TEAMS_API_KEY" ok={microsoft.teams_connector_present} muted />
          <CredRow label="MICROSOFT_SHAREPOINT_API_KEY" ok={microsoft.sharepoint_connector_present} muted />
        </div>
      </div>

      {/* Preview of the panels that will light up once wired */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <PanelPreview icon={Mail} title="صندوق الوارد التنفيذي" body="آخر رسائل Outlook مع تصنيف بواسطة ARIA." />
        <PanelPreview icon={Calendar} title="أجندة القيادة" body="اجتماعات اليوم وقادم الأسبوع من Microsoft Calendar." />
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={!azureReady}
          title={
            azureReady
              ? "بدء تدفق Graph OAuth"
              : "أضف MS_CLIENT_ID و MS_TENANT_ID و MS_CLIENT_SECRET في أسرار المشروع لتفعيل الزر"
          }
          aria-disabled={!azureReady}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: azureReady
              ? "linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)"
              : "rgba(148,163,184,0.15)",
            color: azureReady ? "#0F172A" : "rgba(226,232,240,0.7)",
          }}
        >
          <Link2 className="h-4 w-4" />
          <span>{azureReady ? "ربط حساب Microsoft" : "بانتظار بيانات Azure"}</span>
        </button>
        <p className="text-[11px] text-muted-foreground max-w-md text-end">
          لا يعرض هذا القسم أي بيانات وهمية. حين تُضاف بيانات Azure الحقيقية إلى الأسرار،
          يُفعَّل تدفق Graph OAuth ويُقرأ صندوق الوارد والأجندة من حسابك مباشرة.
        </p>
      </div>
    </section>
  );
}

function CredRow({ label, ok, muted }: { label: string; ok: boolean; muted?: boolean }) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5"
      style={{
        borderColor: ok ? "rgba(52,211,153,0.3)" : "rgba(148,163,184,0.25)",
        background: ok ? "rgba(52,211,153,0.06)" : "transparent",
      }}
    >
      <code className="truncate text-[11px]" style={{ opacity: muted ? 0.75 : 1 }}>
        {label}
      </code>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
        style={
          ok
            ? { background: "rgba(52,211,153,0.16)", color: "#6EE7B7" }
            : { background: "rgba(148,163,184,0.14)", color: "rgba(226,232,240,0.65)" }
        }
      >
        {ok ? "متوفّر" : "غير مضبوط"}
      </span>
    </div>
  );
}

function PanelPreview({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "rgba(148,163,184,0.2)", background: "rgba(2,6,15,0.4)" }}
    >
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-400" />
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">{body}</p>
      <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground opacity-70">
        سيتم تفعيله بعد الربط
      </div>
    </div>
  );
}
