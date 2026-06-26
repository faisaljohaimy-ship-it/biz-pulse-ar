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
import { ArrowLeft, CheckCircle2, Loader2, Plus, RefreshCw, Save, ShieldCheck, TestTube2, Trash2, XCircle, Zap } from "lucide-react";
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
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/forbidden/i.test(msg)) setForbidden(true);
        else toast.error(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [fetchFn]);

  function addUri() {
    const v = uriDraft.trim();
    if (!v) return;
    try { new URL(v); } catch { toast.error(isAr ? "رابط غير صالح" : "Invalid URL"); return; }
    if (uris.includes(v)) { setUriDraft(""); return; }
    if (uris.length >= 20) { toast.error(isAr ? "حد أقصى 20 رابطاً" : "Maximum 20 URIs"); return; }
    setUris([...uris, v]);
    setUriDraft("");
  }

  async function onSave() {
    setSaving(true);
    try {
      const saved = await saveFn({ data: {
        tenant_id: tenantId.trim() || null,
        client_id: clientId.trim() || null,
        redirect_uris: uris,
        default_site_id: siteId.trim() || null,
        default_team_id: teamId.trim() || null,
        default_channel_id: channelId.trim() || null,
        notes: notes.trim() || null,
      }});
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
      if (r.ok) toast.success((isAr ? "اتصال ناجح — " : "Connection OK — ") + (r.user?.userPrincipalName ?? r.user?.mail ?? r.user?.displayName ?? ""));
      else toast.error((isAr ? "فشل الاتصال: " : "Connection failed: ") + (r.error ?? `HTTP ${r.status}`));
      // refresh row to reflect test stamp
      const fresh = await fetchFn();
      if (fresh) setRow(fresh);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</div>;
  if (forbidden) return (
    <div className="mx-auto max-w-2xl p-8">
      <Card className="p-6 text-center space-y-2">
        <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
        <div className="font-semibold">{isAr ? "صلاحية مسؤول مطلوبة" : "Admin role required"}</div>
        <p className="text-sm text-muted-foreground">
          {isAr ? "إعدادات تكامل Microsoft متاحة للمسؤولين فقط." : "Microsoft integration settings are admin-only."}
        </p>
      </Card>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/settings" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
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
        <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> Admin</Badge>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tenant">{isAr ? "Tenant (Directory) ID" : "Tenant (Directory) ID"}</Label>
            <Input id="tenant" value={tenantId} onChange={e => setTenantId(e.target.value)}
              placeholder="contoso.onmicrosoft.com / GUID" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client">{isAr ? "Application (Client) ID" : "Application (Client) ID"}</Label>
            <Input id="client" value={clientId} onChange={e => setClientId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{isAr ? "عناوين إعادة التوجيه المعتمدة" : "Authorized Redirect URIs"}</Label>
          <div className="flex gap-2">
            <Input
              value={uriDraft}
              onChange={e => setUriDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addUri(); } }}
              placeholder="https://your-app.com/auth/callback"
            />
            <Button type="button" variant="outline" onClick={addUri}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {uris.map(u => (
              <Badge key={u} variant="secondary" className="gap-1 max-w-full">
                <span className="truncate max-w-[24rem]">{u}</span>
                <button onClick={() => setUris(uris.filter(x => x !== u))} className="opacity-60 hover:opacity-100">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {uris.length === 0 && (
              <span className="text-xs text-muted-foreground">{isAr ? "لا توجد عناوين بعد" : "No URIs yet"}</span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="site">{isAr ? "SharePoint Site (افتراضي)" : "Default SharePoint Site"}</Label>
            <Input id="site" value={siteId} onChange={e => setSiteId(e.target.value)} placeholder="host,site-collection,site" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team">{isAr ? "Teams Team (افتراضي)" : "Default Teams Team"}</Label>
            <Input id="team" value={teamId} onChange={e => setTeamId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="channel">{isAr ? "Teams Channel (افتراضي)" : "Default Teams Channel"}</Label>
            <Input id="channel" value={channelId} onChange={e => setChannelId(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">{isAr ? "ملاحظات داخلية" : "Internal notes"}</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isAr ? "حفظ" : "Save"}
          </Button>
          <Button variant="outline" onClick={onTest} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
            {isAr ? "اختبار الاتصال" : "Test connection"}
          </Button>
          {row?.last_tested_at && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {row.last_test_status === "ok"
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                : <XCircle className="h-3.5 w-3.5 text-destructive" />}
              <span>
                {isAr ? "آخر اختبار" : "Last test"}: {new Date(row.last_tested_at).toLocaleString()}
                {row.last_test_user ? ` · ${row.last_test_user}` : ""}
                {row.last_test_error ? ` · ${row.last_test_error}` : ""}
              </span>
            </div>
          )}
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
