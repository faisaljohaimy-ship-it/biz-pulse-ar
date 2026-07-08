import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  TestTube2,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { Switch } from "@/components/ui/switch";
import {
  getMicrosoftIntegration,
  upsertMicrosoftIntegration,
  testMicrosoftConnection,
  updateMicrosoftSyncSettings,
  listMicrosoftSyncLog,
  triggerMicrosoftSyncNow,
  type MicrosoftIntegrationRow,
  type MicrosoftSyncLogRow,
} from "@/lib/integration-microsoft.functions";

export const Route = createFileRoute("/_authenticated/settings/microsoft")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: MicrosoftSettingsPage,
});

function MicrosoftSettingsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const fetchFn = useServerFn(getMicrosoftIntegration);
  const saveFn = useServerFn(upsertMicrosoftIntegration);
  const testFn = useServerFn(testMicrosoftConnection);

  const [row, setRow] = useState<MicrosoftIntegrationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingSync, setSavingSync] = useState(false);
  const [outlookSync, setOutlookSync] = useState(false);
  const [sharepointSync, setSharepointSync] = useState(false);
  const [intervalMin, setIntervalMin] = useState<number>(15);
  const [logs, setLogs] = useState<MicrosoftSyncLogRow[]>([]);
  const saveSyncFn = useServerFn(updateMicrosoftSyncSettings);
  const listLogFn = useServerFn(listMicrosoftSyncLog);
  const triggerFn = useServerFn(triggerMicrosoftSyncNow);

  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [uris, setUris] = useState<string[]>([]);
  const [uriDraft, setUriDraft] = useState("");
  const [siteId, setSiteId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchFn();
        if (!alive) return;
        if (data) {
          setRow(data);
          setTenantId(data.tenant_id ?? "");
          setClientId(data.client_id ?? "");
          setUris(data.redirect_uris ?? []);
          setSiteId(data.default_site_id ?? "");
          setTeamId(data.default_team_id ?? "");
          setChannelId(data.default_channel_id ?? "");
          setNotes(data.notes ?? "");
          setOutlookSync(data.sync_outlook_enabled);
          setSharepointSync(data.sync_sharepoint_enabled);
          setIntervalMin(data.sync_interval_minutes ?? 15);
        }
        try {
          const l = await listLogFn();
          if (alive) setLogs(l);
        } catch {
          /* non-fatal */
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/forbidden/i.test(msg)) setForbidden(true);
        else toast.error(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchFn, listLogFn]);

  function addUri() {
    const v = uriDraft.trim();
    if (!v) return;
    try {
      new URL(v);
    } catch {
      toast.error(isAr ? "رابط غير صالح" : "Invalid URL");
      return;
    }
    if (uris.includes(v)) {
      setUriDraft("");
      return;
    }
    if (uris.length >= 20) {
      toast.error(isAr ? "حد أقصى 20 رابطاً" : "Maximum 20 URIs");
      return;
    }
    setUris([...uris, v]);
    setUriDraft("");
  }

  async function onSave() {
    setSaving(true);
    try {
      const saved = await saveFn({
        data: {
          tenant_id: tenantId.trim() || null,
          client_id: clientId.trim() || null,
          redirect_uris: uris,
          default_site_id: siteId.trim() || null,
          default_team_id: teamId.trim() || null,
          default_channel_id: channelId.trim() || null,
          notes: notes.trim() || null,
        },
      });
      setRow(saved);
      toast.success(isAr ? "تم حفظ الإعدادات" : "Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    try {
      const r = await testFn();
      if (r.ok)
        toast.success(
          (isAr ? "اتصال ناجح — " : "Connection OK — ") +
            (r.user?.userPrincipalName ?? r.user?.mail ?? r.user?.displayName ?? ""),
        );
      else
        toast.error(
          (isAr ? "فشل الاتصال: " : "Connection failed: ") + (r.error ?? `HTTP ${r.status}`),
        );
      // refresh row to reflect test stamp
      const fresh = await fetchFn();
      if (fresh) setRow(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  }

  async function refreshLogs() {
    try {
      setLogs(await listLogFn());
    } catch {
      /* ignore */
    }
  }

  async function onSaveSync() {
    setSavingSync(true);
    try {
      const saved = await saveSyncFn({
        data: {
          sync_outlook_enabled: outlookSync,
          sync_sharepoint_enabled: sharepointSync,
          sync_interval_minutes: intervalMin,
        },
      });
      setRow(saved);
      toast.success(isAr ? "تم حفظ إعدادات المزامنة" : "Sync settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingSync(false);
    }
  }

  async function onSyncNow() {
    setSyncing(true);
    try {
      const r = await triggerFn();
      if (r.ok) toast.success(isAr ? "بدأت المزامنة" : "Sync triggered");
      else toast.error((isAr ? "فشل التشغيل: " : "Trigger failed: ") + `HTTP ${r.status}`);
      // give the server a moment to write logs
      setTimeout(refreshLogs, 1500);
      const fresh = await fetchFn();
      if (fresh) setRow(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  if (loading)
    return (
      <div className="p-8 text-sm text-muted-foreground">
        {isAr ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  if (forbidden)
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card className="p-6 text-center space-y-2">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="font-semibold">
            {isAr ? "صلاحية مسؤول مطلوبة" : "Admin role required"}
          </div>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "إعدادات تكامل Microsoft متاحة للمسؤولين فقط."
              : "Microsoft integration settings are admin-only."}
          </p>
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/settings"
            className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> {isAr ? "العودة للإعدادات" : "Back to settings"}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {isAr ? "تكامل Microsoft Identity" : "Microsoft Identity Integration"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "إعدادات Tenant و Client ID و عناوين إعادة التوجيه المعتمدة، مع اختبار الاتصال عبر Microsoft Graph."
              : "Tenant, client ID and authorized redirect URIs, with a Microsoft Graph connection test."}
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" /> Admin
        </Badge>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tenant">
              {isAr ? "Tenant (Directory) ID" : "Tenant (Directory) ID"}
            </Label>
            <Input
              id="tenant"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="contoso.onmicrosoft.com / GUID"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client">
              {isAr ? "Application (Client) ID" : "Application (Client) ID"}
            </Label>
            <Input
              id="client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{isAr ? "عناوين إعادة التوجيه المعتمدة" : "Authorized Redirect URIs"}</Label>
          <div className="flex gap-2">
            <Input
              value={uriDraft}
              onChange={(e) => setUriDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUri();
                }
              }}
              placeholder="https://your-app.com/auth/callback"
            />
            <Button type="button" variant="outline" onClick={addUri}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {uris.map((u) => (
              <Badge key={u} variant="secondary" className="gap-1 max-w-full">
                <span className="truncate max-w-[24rem]">{u}</span>
                <button
                  onClick={() => setUris(uris.filter((x) => x !== u))}
                  className="opacity-60 hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {uris.length === 0 && (
              <span className="text-xs text-muted-foreground">
                {isAr ? "لا توجد عناوين بعد" : "No URIs yet"}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="site">
              {isAr ? "SharePoint Site (افتراضي)" : "Default SharePoint Site"}
            </Label>
            <Input
              id="site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              placeholder="host,site-collection,site"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team">{isAr ? "Teams Team (افتراضي)" : "Default Teams Team"}</Label>
            <Input id="team" value={teamId} onChange={(e) => setTeamId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="channel">
              {isAr ? "Teams Channel (افتراضي)" : "Default Teams Channel"}
            </Label>
            <Input id="channel" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">{isAr ? "ملاحظات داخلية" : "Internal notes"}</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isAr ? "حفظ" : "Save"}
          </Button>
          <Button variant="outline" onClick={onTest} disabled={testing} className="gap-2">
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube2 className="h-4 w-4" />
            )}
            {isAr ? "اختبار الاتصال" : "Test connection"}
          </Button>
          {row?.last_tested_at && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {row.last_test_status === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span>
                {isAr ? "آخر اختبار" : "Last test"}: {new Date(row.last_tested_at).toLocaleString()}
                {row.last_test_user ? ` · ${row.last_test_user}` : ""}
                {row.last_test_error ? ` · ${row.last_test_error}` : ""}
              </span>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {isAr ? "المزامنة التلقائية مع Microsoft Graph" : "Automatic Microsoft Graph sync"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr
                ? "بعد نجاح اختبار الاتصال، فعّل المزامنة الدورية لجلب رسائل Outlook ومحتوى SharePoint عبر Graph تلقائياً. تعمل المهمة كل 15 دقيقة وتحترم الفاصل الزمني المختار."
                : "Once the connection test succeeds, enable periodic sync to pull Outlook messages and SharePoint content via Graph. The scheduler runs every 15 minutes and respects the chosen interval."}
            </p>
          </div>
          <Badge
            variant={
              row?.last_sync_status === "ok"
                ? "default"
                : row?.last_sync_status === "error"
                  ? "destructive"
                  : "outline"
            }
          >
            {row?.last_sync_status ?? (isAr ? "لم تبدأ" : "idle")}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Outlook</div>
              <div className="text-[11px] text-muted-foreground">
                {isAr ? "آخر 25 رسالة في الصندوق" : "Latest 25 inbox messages"}
              </div>
            </div>
            <Switch checked={outlookSync} onCheckedChange={setOutlookSync} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">SharePoint</div>
              <div className="text-[11px] text-muted-foreground">
                {isAr ? "أحدث ملفات الموقع الافتراضي" : "Default site recent items"}
              </div>
            </div>
            <Switch checked={sharepointSync} onCheckedChange={setSharepointSync} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interval">
              {isAr ? "الفاصل الزمني (دقائق)" : "Interval (minutes)"}
            </Label>
            <Input
              id="interval"
              type="number"
              min={5}
              max={1440}
              value={intervalMin}
              onChange={(e) =>
                setIntervalMin(Math.max(5, Math.min(1440, Number(e.target.value) || 15)))
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSaveSync} disabled={savingSync} className="gap-2">
            {savingSync ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isAr ? "حفظ المزامنة" : "Save sync"}
          </Button>
          <Button variant="outline" onClick={onSyncNow} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {isAr ? "تشغيل الآن" : "Sync now"}
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshLogs} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            {isAr ? "تحديث السجل" : "Refresh log"}
          </Button>
          {row?.last_sync_at && (
            <span className="text-xs text-muted-foreground">
              {isAr ? "آخر مزامنة" : "Last sync"}: {new Date(row.last_sync_at).toLocaleString()}
              {row.last_sync_error ? ` · ${row.last_sync_error}` : ""}
            </span>
          )}
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1.5 text-start">{isAr ? "الوقت" : "Time"}</th>
                <th className="px-2 py-1.5 text-start">{isAr ? "النوع" : "Kind"}</th>
                <th className="px-2 py-1.5 text-start">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-2 py-1.5 text-start">{isAr ? "العناصر" : "Items"}</th>
                <th className="px-2 py-1.5 text-start">{isAr ? "المدة" : "Duration"}</th>
                <th className="px-2 py-1.5 text-start">{isAr ? "الخطأ" : "Error"}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">
                    {isAr ? "لا توجد عمليات بعد" : "No runs yet"}
                  </td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {new Date(l.started_at).toLocaleTimeString()}
                  </td>
                  <td className="px-2 py-1.5">{l.kind}</td>
                  <td className="px-2 py-1.5">
                    {l.status === "ok" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        ok
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle className="h-3 w-3" />
                        {l.status}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{l.items_count}</td>
                  <td className="px-2 py-1.5">
                    {l.duration_ms != null ? `${l.duration_ms}ms` : "—"}
                  </td>
                  <td
                    className="px-2 py-1.5 text-muted-foreground truncate max-w-[18rem]"
                    title={l.error ?? ""}
                  >
                    {l.error ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 text-xs text-muted-foreground space-y-1">
        <div className="font-medium text-foreground">{isAr ? "ملاحظة" : "Note"}</div>
        <p>
          {isAr
            ? "يستخدم النظام موصِّل Microsoft المُدار للوصول إلى Graph (Outlook, SharePoint, Teams). تُحفظ هذه القيم كمرجع إداري لتسجيل تطبيقك في Microsoft Entra؛ زر «اختبار الاتصال» يستدعي /me عبر الموصِّل الفعلي."
            : "The system uses the managed Microsoft connector to reach Graph (Outlook, SharePoint, Teams). These values are stored as an administrative reference for registering your app in Microsoft Entra; the Test button calls /me through the live connector."}
        </p>
      </Card>
    </div>
  );
}
