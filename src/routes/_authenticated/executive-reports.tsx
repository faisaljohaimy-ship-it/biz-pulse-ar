import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { listSharePointSites } from "@/lib/sharepoint.functions";
import { listTeamsChannels } from "@/lib/teams.functions";
import { publishExecutiveReport } from "@/lib/exec-reports.functions";
import type { PublishErrorEnvelope } from "@/lib/exec-reports.functions";
import { getCurrentUserIsAdmin } from "@/lib/authz.functions";
import {
  AlertTriangle,
  FileText,
  Send,
  ShieldCheck,
  ShieldX,
  ExternalLink,
  Loader2,
  X,
  ClipboardCopy,
  FlaskConical,
} from "lucide-react";
import { BinaryReportsPanel } from "@/components/exec/binary-reports-panel";

const STAGE_LABEL: Record<PublishErrorEnvelope["stage"], { en: string; ar: string }> = {
  config: { en: "Connector configuration", ar: "إعداد الموصّل" },
  authorization: { en: "Authorization", ar: "الصلاحيات" },
  validation: { en: "Input validation", ar: "التحقق من المدخلات" },
  sharepoint_upload: { en: "SharePoint upload", ar: "رفع SharePoint" },
  sharepoint_createLink: { en: "SharePoint share link", ar: "رابط مشاركة SharePoint" },
  teams_post: { en: "Teams post", ar: "نشر Teams" },
  unknown: { en: "Unknown", ar: "غير معروف" },
};
import { MOCK_SCENARIOS, type MockScenario } from "./-executive-reports.mocks";

const ENABLE_GRAPH_SIMULATION = import.meta.env.DEV;

function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePublishError(e: unknown): PublishErrorEnvelope | null {
  const msg = (e as { message?: string })?.message;
  if (!msg) return null;
  try {
    const j = JSON.parse(msg);
    if (j && j.__publishError) return j as PublishErrorEnvelope;
  } catch {
    /* not a structured error */
  }
  return null;
}

export const Route = createFileRoute("/_authenticated/executive-reports")({
  component: ExecutiveReportsPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-6">
      <Card className="p-6">
        <div className="text-destructive font-semibold">Reports error</div>
        <div className="text-sm text-muted-foreground mt-1">{error.message}</div>
        <Button className="mt-3" onClick={reset}>
          Retry
        </Button>
      </Card>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

type SiteOpt = { id: string; displayName: string };
type ChannelOpt = { id: string; teamId: string; displayName: string; teamName: string };
type Briefing = {
  id: string;
  title: string | null;
  title_en: string | null;
  summary: string | null;
  summary_en: string | null;
  generated_at: string | null;
};

function ExecutiveReportsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const { user } = useAuth();
  const fetchSites = useServerFn(listSharePointSites);
  const fetchChannels = useServerFn(listTeamsChannels);
  const publish = useServerFn(publishExecutiveReport);
  const getIsAdmin = useServerFn(getCurrentUserIsAdmin);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sites, setSites] = useState<SiteOpt[]>([]);
  const [channels, setChannels] = useState<ChannelOpt[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [channelKey, setChannelKey] = useState<string>(""); // "teamId|channelId"
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [lastResult, setLastResult] = useState<Awaited<
    ReturnType<typeof publishExecutiveReport>
  > | null>(null);
  const [lastError, setLastError] = useState<PublishErrorEnvelope | null>(null);

  // «بيانات لا تفرغ»: guests browsing the public showcase see a labelled
  // reference briefing set instead of an empty page (publishing itself
  // remains admin-only).
  useEffect(() => {
    if (user) return;
    const day = 86_400_000;
    setBriefings(
      [
        ["ملخص الجاهزية الأمنية — الأسبوع الجاري", "Weekly security readiness", 0.2],
        ["تقرير الامتثال لتوجيهات HCIS — يوليو", "HCIS compliance — July", 3],
        ["مؤشرات تصاريح العمل الحرج", "Critical PTW indicators", 7],
        ["موجز غرفة العمليات — مناورة الإخلاء", "Ops room brief — evacuation drill", 12],
      ].map(([title, title_en, agoDays], i) => ({
        id: `sim-brief-${i + 1}`,
        title: title as string,
        title_en: title_en as string,
        summary: "ملخص مرجعي للعرض العام — النسخة الكاملة متاحة بعد تسجيل الدخول.",
        summary_en: "Reference summary for the public showcase.",
        generated_at: new Date(Date.now() - (agoDays as number) * day).toISOString(),
      })),
    );
    setLoading(false);
  }, [user]);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const result = await getIsAdmin();
      if (alive) setIsAdmin(Boolean(result.isAdmin));
    })();
    return () => {
      alive = false;
    };
  }, [getIsAdmin, user]);

  // Load sites, channels, briefings (only if admin)
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [spRes, tRes, briefRes] = await Promise.allSettled([
          fetchSites(),
          fetchChannels(),
          supabase
            .from("executive_briefings")
            .select("id,title,title_en,summary,summary_en,generated_at")
            .order("generated_at", { ascending: false })
            .limit(20),
        ]);
        if (!alive) return;
        if (spRes.status === "fulfilled") setSites(spRes.value.sites);
        else toast.error(isAr ? "تعذّر تحميل مواقع SharePoint" : "Failed to load SharePoint sites");
        if (tRes.status === "fulfilled") {
          const teamMap = new Map(
            (tRes.value.teams ?? []).map((team) => [team.id, team.displayName]),
          );
          setChannels(
            (tRes.value.channels ?? []).map((channel) => ({
              id: channel.id,
              teamId: channel.teamId,
              displayName: channel.displayName,
              teamName: teamMap.get(channel.teamId) ?? "",
            })),
          );
        } else
          toast.error(
            isAr
              ? "تعذر الاتصال بقنوات Teams حاليًا، وسيتم إعادة المحاولة تلقائيًا دون التأثير على بقية النظام."
              : "Couldn't reach Teams channels right now — will retry automatically without affecting the rest of the system.",
          );
        if (briefRes.status === "fulfilled" && briefRes.value.data)
          setBriefings(briefRes.value.data as Briefing[]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin, fetchSites, fetchChannels, isAr]);

  const groupedChannels = useMemo(() => {
    const m = new Map<string, ChannelOpt[]>();
    for (const c of channels) {
      const arr = m.get(c.teamName) ?? [];
      arr.push(c);
      m.set(c.teamName, arr);
    }
    return Array.from(m.entries());
  }, [channels]);

  const pickBriefing = (b: Briefing) => {
    setTitle((isAr ? b.title : b.title_en) ?? b.title ?? b.title_en ?? "Executive Briefing");
    setSubtitle(b.generated_at ? new Date(b.generated_at).toLocaleString() : "");
    setSummary((isAr ? b.summary : b.summary_en) ?? b.summary ?? b.summary_en ?? "");
  };

  const onPublish = async () => {
    if (!siteId || !channelKey || !title) {
      toast.error(isAr ? "أكمل جميع الحقول" : "Fill all required fields");
      return;
    }
    const [teamId, channelId] = channelKey.split("|");
    setPublishing(true);
    setLastError(null);
    try {
      const result = await publish({
        data: {
          siteId,
          teamId,
          channelId,
          title,
          subtitle: subtitle || undefined,
          summary: summary || undefined,
        },
      });
      setLastResult(result);
      toast.success(
        isAr
          ? "تم النشر إلى SharePoint وإرساله إلى Teams"
          : "Published to SharePoint and posted to Teams",
      );
    } catch (e: unknown) {
      const env = parsePublishError(e);
      if (env) {
        setLastError(env);
        toast.error(isAr ? env.message_ar : env.message_en);
      } else {
        const msg = (e as { message?: string })?.message ?? (isAr ? "فشل النشر" : "Publish failed");
        setLastError({
          __publishError: true,
          stage: "unknown",
          requestId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          message_en: msg,
          message_ar: msg,
        });
        toast.error(msg);
      }
    } finally {
      setPublishing(false);
    }
  };

  const [mockKey, setMockKey] = useState<string>(MOCK_SCENARIOS[0].key);
  const simulateMockError = () => {
    if (!ENABLE_GRAPH_SIMULATION) return;
    const scenario = MOCK_SCENARIOS.find((s) => s.key === mockKey) ?? MOCK_SCENARIOS[0];
    const env: PublishErrorEnvelope = {
      __publishError: true,
      requestId: newRequestId(),
      ...scenario.build(),
    };
    setLastResult(null);
    setLastError(env);
    toast.error(isAr ? env.message_ar : env.message_en);
  };

  const simulateMockSuccess = () => {
    if (!ENABLE_GRAPH_SIMULATION) return;
    const now = new Date();
    const stamp = now.toISOString();
    const safeTitle = (title || (isAr ? "تقرير-تنفيذي-تجريبي" : "executive-report-mock")).replace(
      /\s+/g,
      "-",
    );
    const filename = `${safeTitle}-${stamp.slice(0, 10)}.html`;
    const siteHost = "sharepoint.example.invalid";
    const sitePath = "/sites/exec";
    const webUrl = `https://${siteHost}${sitePath}/Shared%20Documents/NEXIOS%20Reports/${encodeURIComponent(filename)}`;
    const shareUrl = `https://${siteHost}/:b:/s/exec/${newRequestId().replace(/-/g, "").slice(0, 22)}`;
    const teamsMessageId = `${Date.now()}`;
    const teamsMessageUrl = `https://teams.microsoft.com/l/message/19%3Amock-channel%40thread.tacv2/${teamsMessageId}?tenantId=mock-tenant&groupId=mock-group&parentMessageId=${teamsMessageId}`;
    const mockResult: Awaited<ReturnType<typeof publishExecutiveReport>> = {
      ok: true,
      generatedAt: stamp,
      sharepoint: {
        itemId: `mock-${newRequestId()}`,
        name: filename,
        webUrl,
        size: 4096,
        shareUrl,
      },
      teams: {
        messageId: teamsMessageId,
        messageUrl: teamsMessageUrl,
      },
    };
    setLastError(null);
    setLastResult(mockResult);
    toast.success(
      isAr
        ? "محاكاة نجاح — لم يتم استدعاء Microsoft Graph"
        : "Mock success — Microsoft Graph was not called",
    );
  };

  if (isAdmin === false) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <ShieldX className="h-12 w-12 mx-auto text-destructive mb-3" />
          <div className="text-lg font-semibold">
            {isAr ? "صلاحية غير كافية" : "Insufficient permissions"}
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {isAr
              ? "نشر التقارير التنفيذية إلى Microsoft 365 يتطلب صلاحية المسؤول (admin)."
              : "Publishing executive reports to Microsoft 365 requires the admin role."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        icon={FileText}
        title={isAr ? "التقارير التنفيذية" : "Executive Reports"}
        subtitle={
          isAr
            ? "نشر التقارير إلى SharePoint وإرسال الرابط إلى Teams"
            : "Publish reports to SharePoint and send the link to Teams"
        }
        badge={isAdmin ? (isAr ? "Admin" : "Admin") : undefined}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Briefings picker */}
        <Card className="md:col-span-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm">
              {isAr ? "ملخصات سابقة" : "Recent Briefings"}
            </div>
            <Badge variant="outline" className="text-xs">
              {briefings.length}
            </Badge>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {loading && (
              <div className="text-xs text-muted-foreground">
                {isAr ? "جاري التحميل..." : "Loading..."}
              </div>
            )}
            {!loading && briefings.length === 0 && (
              <div className="text-xs text-muted-foreground">
                {isAr ? "لا توجد ملخصات بعد" : "No briefings yet"}
              </div>
            )}
            {briefings.map((b) => (
              <button
                key={b.id}
                onClick={() => pickBriefing(b)}
                className="w-full text-start rounded-lg border border-border/60 p-3 hover:bg-muted/50 transition"
              >
                <div className="text-sm font-medium line-clamp-1">
                  {(isAr ? b.title : b.title_en) ?? b.title ?? "Untitled"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {b.generated_at ? new Date(b.generated_at).toLocaleString() : ""}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Compose + Publish */}
        <Card className="md:col-span-2 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {isAr ? "حسب صلاحيات المستخدم" : "Permission-gated"}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-xs">
              {isAr
                ? "ينشر بهوية حساب الـ Microsoft 365 الموصّل"
                : "Publishes using the connected Microsoft 365 account"}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">{isAr ? "موقع SharePoint" : "SharePoint Site"}</Label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={loading || sites.length === 0}
              >
                <option value="">{isAr ? "اختر موقعاً" : "Select a site"}</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">{isAr ? "قناة Teams" : "Teams Channel"}</Label>
              <select
                value={channelKey}
                onChange={(e) => setChannelKey(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={loading || channels.length === 0}
              >
                <option value="">{isAr ? "اختر قناة" : "Select a channel"}</option>
                {groupedChannels.map(([team, list]) => (
                  <optgroup key={team} label={team}>
                    {list.map((c) => (
                      <option key={`${c.teamId}|${c.id}`} value={`${c.teamId}|${c.id}`}>
                        {c.displayName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs">{isAr ? "العنوان" : "Title"}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isAr ? "تقرير تنفيذي - الربع الحالي" : "Executive report — Q current"}
            />
          </div>
          <div>
            <Label className="text-xs">{isAr ? "العنوان الفرعي" : "Subtitle"}</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{isAr ? "الملخص" : "Summary"}</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={8} />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {isAr ? "سيُحفظ في" : "Saves into"}{" "}
              <code className="text-foreground">/NEXIOS Reports/</code>
            </div>
            <Button
              onClick={onPublish}
              disabled={publishing || loading || !siteId || !channelKey || !title}
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ms-2">
                {isAr ? "نشر إلى SharePoint + Teams" : "Publish to SharePoint + Teams"}
              </span>
            </Button>
          </div>

          {ENABLE_GRAPH_SIMULATION && (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FlaskConical className="h-3.5 w-3.5" />
                {isAr
                  ? "وضع المحاكاة — متاح في بيئة التطوير فقط"
                  : "Simulation mode — development only"}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={mockKey}
                  onChange={(e) => setMockKey(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  {MOCK_SCENARIOS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {isAr ? s.label_ar : s.label_en}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={simulateMockError}>
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span className="ms-2">{isAr ? "محاكاة الخطأ" : "Simulate error"}</span>
                </Button>
                <Button size="sm" variant="default" onClick={simulateMockSuccess}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="ms-2">{isAr ? "محاكاة النجاح" : "Simulate success"}</span>
                </Button>
              </div>
            </div>
          )}

          {lastError &&
            (() => {
              const stageLabel = STAGE_LABEL[lastError.stage];
              let partialSharepointUrl: string | null = null;
              if (lastError.stage === "teams_post" && lastError.raw) {
                try {
                  const r = JSON.parse(lastError.raw);
                  if (typeof r?.sharepointUrl === "string") partialSharepointUrl = r.sharepointUrl;
                } catch {
                  /* ignore */
                }
              }
              const copyRequestId = () => {
                if (!lastError.requestId) return;
                navigator.clipboard
                  .writeText(lastError.requestId)
                  .then(() => toast.success(isAr ? "تم النسخ" : "Copied"));
              };
              return (
                <Card className="p-4 border-destructive/40 bg-destructive/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-destructive">
                          {isAr ? lastError.message_ar : lastError.message_en}
                        </span>
                      </div>

                      {/* Diagnostic chips */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {isAr ? stageLabel.ar : stageLabel.en}
                        </Badge>
                        {lastError.status && (
                          <Badge variant="outline" className="text-[10px]">
                            HTTP {lastError.status}
                          </Badge>
                        )}
                        {lastError.code && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {lastError.code}
                          </Badge>
                        )}
                      </div>

                      {/* Request ID bar */}
                      {lastError.requestId && (
                        <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
                          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                            {isAr ? "معرّف الطلب" : "Request ID"}
                          </span>
                          <code className="text-[11px] font-mono text-foreground">
                            {lastError.requestId}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="ml-auto"
                            onClick={copyRequestId}
                            aria-label={isAr ? "نسخ معرّف الطلب" : "Copy request ID"}
                          >
                            <ClipboardCopy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {(lastError.hint_en || lastError.hint_ar) && (
                        <div className="text-xs text-muted-foreground">
                          💡 {isAr ? lastError.hint_ar : lastError.hint_en}
                        </div>
                      )}

                      {partialSharepointUrl && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">
                            {isAr
                              ? "تم رفع التقرير. افتحه يدوياً:"
                              : "Report was uploaded. Open it manually:"}
                          </span>{" "}
                          <a
                            href={partialSharepointUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> SharePoint
                          </a>
                        </div>
                      )}

                      {lastError.raw && lastError.stage !== "teams_post" && (
                        <details className="text-[11px] text-muted-foreground">
                          <summary className="cursor-pointer">
                            {isAr ? "تفاصيل تقنية" : "Technical details"}
                          </summary>
                          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-2">
                            {lastError.raw}
                          </pre>
                        </details>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setLastError(null)}
                      aria-label={isAr ? "إغلاق" : "Dismiss"}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })()}

          {lastResult && (
            <Card className="p-3 bg-muted/40 border-primary/30">
              <div className="text-sm font-semibold mb-2">
                {isAr ? "تم النشر بنجاح" : "Published successfully"}
              </div>
              <div className="space-y-1 text-xs">
                <div>📄 {lastResult.sharepoint.name}</div>
                <a
                  href={lastResult.sharepoint.shareUrl ?? lastResult.sharepoint.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />{" "}
                  {isAr ? "افتح في SharePoint" : "Open in SharePoint"}
                </a>
                {lastResult.teams.messageUrl && (
                  <div>
                    <a
                      href={lastResult.teams.messageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />{" "}
                      {isAr ? "افتح الرسالة في Teams" : "Open Teams message"}
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}
        </Card>
      </div>

      {/* PDF + Excel + Outlook + Scheduling (production wave) */}
      <BinaryReportsPanel
        sites={sites}
        isAr={isAr}
        defaultSiteId={siteId}
        defaultTitle={title}
        defaultSubtitle={subtitle}
      />
    </div>
  );
}
