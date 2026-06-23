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
import { AlertTriangle, FileText, Send, ShieldCheck, ShieldX, ExternalLink, Loader2, X } from "lucide-react";

const STAGE_LABEL: Record<PublishErrorEnvelope["stage"], { en: string; ar: string }> = {
  config:           { en: "Connector configuration", ar: "إعداد الموصّل" },
  authorization:    { en: "Authorization",           ar: "الصلاحيات" },
  validation:       { en: "Input validation",        ar: "التحقق من المدخلات" },
  sharepoint_upload:{ en: "SharePoint upload",       ar: "رفع SharePoint" },
  sharepoint_link:  { en: "SharePoint share link",   ar: "رابط مشاركة SharePoint" },
  teams_post:       { en: "Teams post",              ar: "نشر Teams" },
  unknown:          { en: "Unknown",                 ar: "غير معروف" },
};

function parsePublishError(e: unknown): PublishErrorEnvelope | null {
  const msg = (e as { message?: string })?.message;
  if (!msg) return null;
  try {
    const j = JSON.parse(msg);
    if (j && j.__publishError) return j as PublishErrorEnvelope;
  } catch { /* not a structured error */ }
  return null;
}

export const Route = createFileRoute("/_authenticated/executive-reports")({
  component: ExecutiveReportsPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-6">
      <Card className="p-6">
        <div className="text-destructive font-semibold">Reports error</div>
        <div className="text-sm text-muted-foreground mt-1">{error.message}</div>
        <Button className="mt-3" onClick={reset}>Retry</Button>
      </Card>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

type SiteOpt = { id: string; displayName: string };
type ChannelOpt = { id: string; teamId: string; displayName: string; teamName: string };
type Briefing = { id: string; title: string | null; title_en: string | null; summary: string | null; summary_en: string | null; generated_at: string | null };

function ExecutiveReportsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const { user } = useAuth();
  const fetchSites = useServerFn(listSharePointSites);
  const fetchChannels = useServerFn(listTeamsChannels);
  const publish = useServerFn(publishExecutiveReport);

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
  const [lastResult, setLastResult] = useState<Awaited<ReturnType<typeof publishExecutiveReport>> | null>(null);
  const [lastError, setLastError] = useState<PublishErrorEnvelope | null>(null);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as never });
      if (alive) setIsAdmin(Boolean(data));
    })();
    return () => { alive = false; };
  }, [user]);

  // Load sites, channels, briefings (only if admin)
  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [spRes, tRes, briefRes] = await Promise.allSettled([
          fetchSites(),
          fetchChannels(),
          supabase.from("executive_briefings").select("id,title,title_en,summary,summary_en,generated_at").order("generated_at", { ascending: false }).limit(20),
        ]);
        if (!alive) return;
        if (spRes.status === "fulfilled") setSites(spRes.value.sites);
        else toast.error(isAr ? "تعذّر تحميل مواقع SharePoint" : "Failed to load SharePoint sites");
        if (tRes.status === "fulfilled") {
          const teamMap = new Map((tRes.value.teams ?? []).map((t: any) => [t.id, t.displayName]));
          setChannels(
            (tRes.value.channels ?? []).map((c: any) => ({
              id: c.id, teamId: c.teamId, displayName: c.displayName, teamName: teamMap.get(c.teamId) ?? "",
            })),
          );
        } else toast.error(isAr ? "تعذّر تحميل قنوات Teams" : "Failed to load Teams channels");
        if (briefRes.status === "fulfilled" && briefRes.value.data) setBriefings(briefRes.value.data as Briefing[]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isAdmin, fetchSites, fetchChannels, isAr]);

  const groupedChannels = useMemo(() => {
    const m = new Map<string, ChannelOpt[]>();
    for (const c of channels) {
      const arr = m.get(c.teamName) ?? [];
      arr.push(c); m.set(c.teamName, arr);
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
        data: { siteId, teamId, channelId, title, subtitle: subtitle || undefined, summary: summary || undefined },
      });
      setLastResult(result);
      toast.success(isAr ? "تم النشر إلى SharePoint وإرساله إلى Teams" : "Published to SharePoint and posted to Teams");
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
          message_en: msg,
          message_ar: msg,
        });
        toast.error(msg);
      }
    } finally {
      setPublishing(false);
    }
  };

  if (isAdmin === false) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <ShieldX className="h-12 w-12 mx-auto text-destructive mb-3" />
          <div className="text-lg font-semibold">{isAr ? "صلاحية غير كافية" : "Insufficient permissions"}</div>
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
            <div className="font-semibold text-sm">{isAr ? "ملخصات سابقة" : "Recent Briefings"}</div>
            <Badge variant="outline" className="text-xs">{briefings.length}</Badge>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {loading && <div className="text-xs text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</div>}
            {!loading && briefings.length === 0 && (
              <div className="text-xs text-muted-foreground">{isAr ? "لا توجد ملخصات بعد" : "No briefings yet"}</div>
            )}
            {briefings.map((b) => (
              <button
                key={b.id}
                onClick={() => pickBriefing(b)}
                className="w-full text-start rounded-lg border border-border/60 p-3 hover:bg-muted/50 transition"
              >
                <div className="text-sm font-medium line-clamp-1">{(isAr ? b.title : b.title_en) ?? b.title ?? "Untitled"}</div>
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
            <span className="font-medium">{isAr ? "حسب صلاحيات المستخدم" : "Permission-gated"}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-xs">
              {isAr ? "ينشر بهوية حساب الـ Microsoft 365 الموصّل" : "Publishes using the connected Microsoft 365 account"}
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
                  <option key={s.id} value={s.id}>{s.displayName}</option>
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
                      <option key={`${c.teamId}|${c.id}`} value={`${c.teamId}|${c.id}`}>{c.displayName}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs">{isAr ? "العنوان" : "Title"}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isAr ? "تقرير تنفيذي - الربع الحالي" : "Executive report — Q current"} />
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
              {isAr ? "سيُحفظ في" : "Saves into"} <code className="text-foreground">/NEXIOS Reports/</code>
            </div>
            <Button onClick={onPublish} disabled={publishing || loading || !siteId || !channelKey || !title}>
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="ms-2">{isAr ? "نشر إلى SharePoint + Teams" : "Publish to SharePoint + Teams"}</span>
            </Button>
          </div>

          {lastResult && (
            <Card className="p-3 bg-muted/40 border-primary/30">
              <div className="text-sm font-semibold mb-2">{isAr ? "تم النشر بنجاح" : "Published successfully"}</div>
              <div className="space-y-1 text-xs">
                <div>📄 {lastResult.sharepoint.name}</div>
                <a
                  href={lastResult.sharepoint.shareUrl ?? lastResult.sharepoint.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> {isAr ? "افتح في SharePoint" : "Open in SharePoint"}
                </a>
                {lastResult.teams.messageUrl && (
                  <div>
                    <a
                      href={lastResult.teams.messageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {isAr ? "افتح الرسالة في Teams" : "Open Teams message"}
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}
        </Card>
      </div>
    </div>
  );
}
