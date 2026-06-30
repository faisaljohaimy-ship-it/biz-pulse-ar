import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, Calendar, Trash2, FileSpreadsheet, FileText as FileTextIcon, X } from "lucide-react";
import {
  publishExecutiveReportBinary,
  listReportSchedules,
  upsertReportSchedule,
  deleteReportSchedule,
  type ReportScheduleRow,
} from "@/lib/exec-reports-binary.functions";

type SiteOption = { id: string; displayName: string };

const RANGES: { value: "24h" | "7d" | "30d"; label_en: string; label_ar: string }[] = [
  { value: "24h", label_en: "Last 24 hours", label_ar: "آخر 24 ساعة" },
  { value: "7d",  label_en: "Last 7 days",   label_ar: "آخر 7 أيام" },
  { value: "30d", label_en: "Last 30 days",  label_ar: "آخر 30 يوماً" },
];

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function BinaryReportsPanel({
  sites,
  isAr,
  defaultSiteId,
  defaultTitle,
  defaultSubtitle,
}: {
  sites: SiteOption[];
  isAr: boolean;
  defaultSiteId?: string;
  defaultTitle?: string;
  defaultSubtitle?: string;
}) {
  const publish = useServerFn(publishExecutiveReportBinary);
  const listFn = useServerFn(listReportSchedules);
  const upsertFn = useServerFn(upsertReportSchedule);
  const deleteFn = useServerFn(deleteReportSchedule);

  const [siteId, setSiteId] = useState(defaultSiteId ?? "");
  const [title, setTitle] = useState(defaultTitle ?? (isAr ? "تقرير تنفيذي يومي" : "Daily Executive Report"));
  const [subtitle, setSubtitle] = useState(defaultSubtitle ?? "");
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [recipientsInput, setRecipientsInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ pdf?: string; xlsx?: string } | null>(null);

  useEffect(() => { if (defaultSiteId) setSiteId(defaultSiteId); }, [defaultSiteId]);
  useEffect(() => { if (defaultTitle) setTitle(defaultTitle); }, [defaultTitle]);

  function addRecipient() {
    const v = recipientsInput.trim();
    if (!v) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast.error(isAr ? "بريد غير صالح" : "Invalid email"); return; }
    if (recipients.includes(v)) { setRecipientsInput(""); return; }
    setRecipients([...recipients, v]);
    setRecipientsInput("");
  }

  async function onSendNow() {
    if (!siteId) { toast.error(isAr ? "اختر موقع SharePoint" : "Pick a SharePoint site"); return; }
    if (recipients.length === 0) { toast.error(isAr ? "أضف مستلماً واحداً على الأقل" : "Add at least one recipient"); return; }
    setSending(true); setLastResult(null);
    try {
      const r = await publish({ data: { siteId, title, subtitle: subtitle || undefined, range, recipients } });
      setLastResult({
        pdf: r.pdf.shareUrl ?? r.pdf.webUrl,
        xlsx: r.xlsx.shareUrl ?? r.xlsx.webUrl,
      });
      toast.success(isAr ? "تم إرسال التقرير عبر Outlook وأرشفته في SharePoint" : "Report emailed via Outlook and archived to SharePoint");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Surface envelope.message if present, else raw
      try {
        const env = JSON.parse(msg);
        toast.error(isAr ? env.message_ar : env.message_en);
      } catch {
        toast.error(msg);
      }
    } finally {
      setSending(false);
    }
  }

  // Schedules
  const [schedules, setSchedules] = useState<ReportScheduleRow[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  async function refreshSchedules() {
    setLoadingSchedules(true);
    try { setSchedules(await listFn()); } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingSchedules(false); }
  }
  useEffect(() => { void refreshSchedules(); }, []);

  // New schedule draft
  const [draft, setDraft] = useState({
    name: isAr ? "تقرير يومي" : "Daily Operations Report",
    frequency: "daily" as "daily" | "weekly",
    hour_utc: 6,
    weekday: 0,
    range_window: "24h" as "24h" | "7d" | "30d",
    enabled: true,
  });

  async function onCreateSchedule() {
    if (!siteId) { toast.error(isAr ? "اختر موقع SharePoint" : "Pick a SharePoint site"); return; }
    if (recipients.length === 0) { toast.error(isAr ? "أضف مستلماً" : "Add a recipient"); return; }
    try {
      await upsertFn({ data: {
        name: draft.name,
        frequency: draft.frequency,
        hour_utc: draft.hour_utc,
        weekday: draft.frequency === "weekly" ? draft.weekday : null,
        range_window: draft.range_window,
        site_id: siteId,
        recipients,
        enabled: draft.enabled,
      }});
      toast.success(isAr ? "تم حفظ الجدول" : "Schedule saved");
      void refreshSchedules();
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  }

  async function onToggle(s: ReportScheduleRow) {
    try {
      await upsertFn({ data: {
        id: s.id, name: s.name, frequency: s.frequency, hour_utc: s.hour_utc,
        weekday: s.weekday, range_window: s.range_window, site_id: s.site_id,
        recipients: s.recipients, enabled: !s.enabled,
      }});
      void refreshSchedules();
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  }

  async function onDelete(s: ReportScheduleRow) {
    if (!confirm(isAr ? `حذف الجدول "${s.name}"؟` : `Delete schedule "${s.name}"?`)) return;
    try { await deleteFn({ data: { id: s.id } }); void refreshSchedules(); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  }

  const siteName = useMemo(
    () => sites.find(s => s.id === siteId)?.displayName ?? siteId,
    [sites, siteId],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Send-now PDF + Excel by Email */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">{isAr ? "إرسال PDF + Excel عبر البريد" : "Send PDF + Excel by Email"}</div>
          <Badge variant="outline" className="text-[10px]">Outlook</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? "ينشئ PDF وExcel من بيانات KPI الحية، يؤرشفهما في SharePoint، ويرسلهما كمرفقات عبر Outlook."
            : "Generates PDF and Excel from live KPI data, archives them in SharePoint, and emails both as attachments via Outlook."}
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">{isAr ? "موقع SharePoint" : "SharePoint Site"}</Label>
            <select value={siteId} onChange={e => setSiteId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">{isAr ? "اختر موقعاً" : "Select a site"}</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">{isAr ? "النطاق الزمني" : "Window"}</Label>
            <select value={range} onChange={e => setRange(e.target.value as "24h" | "7d" | "30d")}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {RANGES.map(r => <option key={r.value} value={r.value}>{isAr ? r.label_ar : r.label_en}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label className="text-xs">{isAr ? "العنوان" : "Title"}</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">{isAr ? "العنوان الفرعي" : "Subtitle"}</Label>
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} />
        </div>

        <div>
          <Label className="text-xs">{isAr ? "المستلمون (Outlook)" : "Recipients (Outlook)"}</Label>
          <div className="flex gap-2 mt-1">
            <Input
              type="email"
              value={recipientsInput}
              onChange={e => setRecipientsInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
              placeholder="ceo@example.com"
            />
            <Button type="button" variant="outline" onClick={addRecipient}>+</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipients.map(r => (
              <Badge key={r} variant="secondary" className="gap-1">
                {r}
                <button onClick={() => setRecipients(recipients.filter(x => x !== r))} className="opacity-60 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <Button onClick={onSendNow} disabled={sending || !siteId || recipients.length === 0} className="w-full">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          <span className="ms-2">{isAr ? "إنشاء وإرسال الآن" : "Generate & Send Now"}</span>
        </Button>

        {lastResult && (
          <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs space-y-1">
            <div className="font-medium">{isAr ? "تم النشر" : "Published"}</div>
            {lastResult.pdf && (
              <a href={lastResult.pdf} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <FileTextIcon className="h-3 w-3" /> PDF
              </a>
            )}
            {lastResult.xlsx && (
              <a href={lastResult.xlsx} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <FileSpreadsheet className="h-3 w-3" /> Excel
              </a>
            )}
          </div>
        )}
      </Card>

      {/* Schedules */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">{isAr ? "الجداول المتكررة" : "Recurring Schedules"}</div>
          <Badge variant="outline" className="text-[10px]">cron · 15min</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? "يُشغّل المُجدول التقارير تلقائياً وفق التكرار اليومي/الأسبوعي ويرسلها لنفس المستلمين أعلاه عند الحفظ."
            : "Saved schedules run automatically every 15 minutes and email the same recipients above."}
        </p>

        {/* draft */}
        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label className="text-xs">{isAr ? "اسم الجدول" : "Schedule name"}</Label>
              <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{isAr ? "التكرار" : "Frequency"}</Label>
              <select value={draft.frequency} onChange={e => setDraft({ ...draft, frequency: e.target.value as "daily" | "weekly" })}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
                <option value="daily">{isAr ? "يومي" : "Daily"}</option>
                <option value="weekly">{isAr ? "أسبوعي" : "Weekly"}</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">{isAr ? "الساعة (UTC)" : "Hour (UTC)"}</Label>
              <Input type="number" min={0} max={23} value={draft.hour_utc}
                onChange={e => setDraft({ ...draft, hour_utc: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })} />
            </div>
            {draft.frequency === "weekly" && (
              <div>
                <Label className="text-xs">{isAr ? "يوم الأسبوع" : "Weekday"}</Label>
                <select value={draft.weekday} onChange={e => setDraft({ ...draft, weekday: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
                  {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}
            <div>
              <Label className="text-xs">{isAr ? "النطاق الزمني" : "Window"}</Label>
              <select value={draft.range_window} onChange={e => setDraft({ ...draft, range_window: e.target.value as "24h" | "7d" | "30d" })}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
                {RANGES.map(r => <option key={r.value} value={r.value}>{isAr ? r.label_ar : r.label_en}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={draft.enabled} onCheckedChange={v => setDraft({ ...draft, enabled: v })} />
              <span className="text-xs">{isAr ? "مُفعّل" : "Enabled"}</span>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {isAr ? "يستخدم" : "Uses"} <code>{siteName || "—"}</code> · {recipients.length} {isAr ? "مستلم" : "recipients"}
          </div>
          <Button size="sm" onClick={onCreateSchedule} disabled={!siteId || recipients.length === 0}>
            {isAr ? "حفظ الجدول" : "Save Schedule"}
          </Button>
        </div>

        {/* list */}
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {loadingSchedules && <div className="text-xs text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</div>}
          {!loadingSchedules && schedules.length === 0 && (
            <div className="text-xs text-muted-foreground">{isAr ? "لا توجد جداول بعد" : "No schedules yet"}</div>
          )}
          {schedules.map(s => (
            <div key={s.id} className="rounded-md border border-border/60 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{s.name}</div>
                <div className="flex items-center gap-2">
                  <Switch checked={s.enabled} onCheckedChange={() => onToggle(s)} />
                  <Button size="icon" variant="ghost" onClick={() => onDelete(s)} aria-label="Delete schedule">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="text-muted-foreground">
                {s.frequency === "daily" ? (isAr ? "يومي" : "Daily") : `${isAr ? "أسبوعي" : "Weekly"} · ${WEEKDAYS[s.weekday ?? 0]}`} ·
                {" "}{String(s.hour_utc).padStart(2, "0")}:00 UTC · {s.range_window} · {s.recipients.length} {isAr ? "مستلم" : "recipients"}
              </div>
              <div className="text-muted-foreground">
                {isAr ? "آخر تشغيل" : "Last run"}: {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "—"}
                {s.last_status && <> · <Badge variant={s.last_status === "ok" ? "default" : "destructive"} className="text-[10px]">{s.last_status}</Badge></>}
              </div>
              {s.last_error && <div className="text-destructive">{s.last_error}</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
