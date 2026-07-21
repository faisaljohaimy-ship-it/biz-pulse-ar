import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { PageBriefing } from "@/components/clarity/PageBriefing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, FileSpreadsheet, Download, RefreshCw, Eye } from "lucide-react";
import {
  generateDailyOperationsReport,
  getDailyOpsData,
  listReports,
  getReportDownloadUrl,
} from "@/lib/oms-reports.functions";

export const Route = createFileRoute("/_authenticated/sec/reports")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Reports,
});

type ReportRow = {
  id: string;
  kind: string;
  format: string;
  title: string;
  related_entity_ref: string | null;
  storage_path: string | null;
  size_bytes: number | null;
  range_from: string | null;
  range_to: string | null;
  generated_by_name: string | null;
  created_at: string;
  meta?: { simulated?: boolean; date?: string } | null;
};

function downloadBlob(file_name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file_name;
  // iOS Safari ignores the download attribute in some versions — the
  // anchor click still opens the file in a viewer tab, which is the
  // accepted fallback there.
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

function base64ToBlob(base64: string, mime: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

type LocalReport = ReportRow & { blobUrl: string };

function Reports() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);
  const [pdfPhase, setPdfPhase] = useState<null | "data" | "font" | "render">(null);
  const [localReports, setLocalReports] = useState<LocalReport[]>([]);
  const blobCache = useRef(new Map<string, string>());

  const fetchList = useServerFn(listReports);
  const {
    data: reports,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["oms-reports"],
    queryFn: () => fetchList(),
    refetchInterval: 60_000,
  });

  const fetchOps = useServerFn(getDailyOpsData);
  const genDaily = useServerFn(generateDailyOperationsReport);

  const buildPdfFor = async (dateKey: string): Promise<{ blob: Blob; file_name: string }> => {
    setPdfPhase("data");
    const ops = await fetchOps({ data: { date: dateKey } });
    setPdfPhase("font");
    // pdf-lib + fontkit + the Arabic font subsets load on demand only —
    // they never touch the initial bundle (performance budget).
    const [{ buildDailyOpsPdf }, fontRes, fontBoldRes] = await Promise.all([
      import("@/lib/reports/daily-ops-pdf"),
      fetch("/fonts/nexios-arabic.ttf"),
      fetch("/fonts/nexios-arabic-bold.ttf"),
    ]);
    if (!fontRes.ok) throw new Error("تعذّر تحميل الخط العربي للتقرير");
    const regular = await fontRes.arrayBuffer();
    // Bold is a typographic upgrade, not a dependency — fall back silently.
    const bold = fontBoldRes.ok ? await fontBoldRes.arrayBuffer() : undefined;
    setPdfPhase("render");
    const bytes = await buildDailyOpsPdf(ops, { regular, bold });
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    return {
      blob: new Blob([ab], { type: "application/pdf" }),
      file_name: `daily-ops-${dateKey}.pdf`,
    };
  };

  const mPdf = useMutation({
    mutationFn: async () => {
      const { blob, file_name } = await buildPdfFor(day);
      const blobUrl = downloadBlob(file_name, blob);
      return { blob, file_name, blobUrl };
    },
    onSuccess: ({ blob, file_name, blobUrl }) => {
      toast.success(`تم توليد ${file_name}`);
      setLocalReports((cur) => [
        {
          id: `local-${Date.now()}`,
          kind: "daily",
          format: "pdf",
          title: `تقرير العمليات اليومي — ${day}`,
          related_entity_ref: null,
          storage_path: null,
          size_bytes: blob.size,
          range_from: `${day}T00:00:00.000Z`,
          range_to: null,
          generated_by_name: "توليد محلي — هذه الجلسة",
          created_at: new Date().toISOString(),
          meta: { simulated: true, date: day },
          blobUrl,
        },
        ...cur,
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setPdfPhase(null),
  });

  const mExcel = useMutation({
    mutationFn: () => genDaily({ data: { date: day } }),
    onSuccess: (res) => {
      downloadBlob(res.file_name, base64ToBlob(res.base64, res.mime_type));
      toast.success(`تم توليد ${res.file_name}`);
      qc.invalidateQueries({ queryKey: ["oms-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getUrl = useServerFn(getReportDownloadUrl);
  const openReport = async (r: ReportRow | LocalReport) => {
    try {
      if ("blobUrl" in r) {
        window.open(r.blobUrl, "_blank", "noopener");
        return;
      }
      const simDate = r.meta?.date ?? r.range_from?.slice(0, 10) ?? today;
      if (r.id.startsWith("sim-rep-")) {
        // Reference-registry rows regenerate deterministically on demand.
        if (r.format === "pdf") {
          const cached = blobCache.current.get(r.id);
          if (cached) {
            window.open(cached, "_blank", "noopener");
            return;
          }
          const { blob, file_name } = await buildPdfFor(simDate);
          const url = downloadBlob(file_name, blob);
          blobCache.current.set(r.id, url);
        } else {
          const res = await genDaily({ data: { date: simDate } });
          downloadBlob(res.file_name, base64ToBlob(res.base64, res.mime_type));
        }
        return;
      }
      const resp = await getUrl({ data: { report_id: r.id } });
      if (resp.url) window.open(resp.url, "_blank", "noopener");
      else toast.error("الملف غير متاح في التخزين");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPdfPhase(null);
    }
  };

  const serverList = (reports ?? []) as ReportRow[];
  const usingReference = serverList.some((r) => r.id.startsWith("sim-rep-"));
  const list: Array<ReportRow | LocalReport> = [...localReports, ...serverList];
  const pdfBusy = mPdf.isPending || pdfPhase !== null;
  const phaseLabel =
    pdfPhase === "data"
      ? "جمع البيانات…"
      : pdfPhase === "font"
        ? "تجهيز الخط العربي…"
        : pdfPhase === "render"
          ? "رسم الصفحات…"
          : null;

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="محرك التقارير"
        subtitle="تقارير حقيقية مولَّدة من بيانات العمليات (PDF · Excel)"
      >
        {usingReference && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-300">
            سجل مرجعي · محاكاة
          </span>
        )}
      </SecPageHeader>

      <PageBriefing
        routeKey="sec-reports"
        what="توليد التقارير التنفيذية بصيغة PDF عربية بخط أنيق وهوية داكنة هولوغرامية، أو Excel."
        dataSource="عمليات اليوم من showcase-simulation (بلاغات · أوامر عمل · تصاريح · أحداث)"
        actions={[
          "ولّد تقرير العمليات اليومي ثم نزّله PDF أو Excel",
          "عايِن التقرير قبل التنزيل",
          "التقارير الجاهزة محفوظة في السجل أسفل الصفحة",
        ]}
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-medium text-foreground">توليد تقرير عمليات يومي</div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label className="text-[10px] text-muted-foreground">التاريخ</label>
            <Input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={() => mPdf.mutate()} disabled={pdfBusy} className="gap-1.5">
            <FileText className="h-4 w-4" />{" "}
            {pdfBusy ? (phaseLabel ?? "جارٍ التوليد…") : "توليد PDF"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => mExcel.mutate()}
            disabled={mExcel.isPending}
            className="gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />{" "}
            {mExcel.isPending ? "جارٍ التوليد…" : "توليد Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> تحديث القائمة
          </Button>
        </div>
        {pdfBusy && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: pdfPhase === "data" ? "30%" : pdfPhase === "font" ? "65%" : "90%",
              }}
            />
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          يجمع البلاغات + أوامر العمل + التصاريح + الأحداث خلال 24 ساعة من التاريخ المحدد ويُحفظ في
          سجل التقارير. PDF عربي كامل بهوية نكسيوس، وتذييل كل صفحة يوثّق حالة المحاكاة.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
          سجل التقارير ({list.length})
        </div>
        <ul className="divide-y divide-border">
          {list.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  {r.format === "pdf" ? (
                    <FileText className="h-4 w-4 text-rose-500" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  )}
                  <span className="truncate">{r.title}</span>
                  {(r.id.startsWith("sim-rep-") || r.meta?.simulated) && (
                    <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-600 dark:text-amber-300">
                      محاكاة
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  <span className="uppercase">{r.kind}</span> · {r.format.toUpperCase()}
                  {r.size_bytes != null && (
                    <> · {Math.max(1, Math.round(r.size_bytes / 1024))} KB</>
                  )}
                  {r.generated_by_name && <> · {r.generated_by_name}</>}
                  <> · {new Date(r.created_at).toLocaleString("ar-SA")}</>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {"blobUrl" in r && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(r.blobUrl, "_blank", "noopener")}
                    className="gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> فتح
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void openReport(r)}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />{" "}
                  {r.id.startsWith("sim-rep-") ? "توليد وتنزيل" : "تنزيل"}
                </Button>
              </div>
            </li>
          ))}
          {list.length === 0 && (
            <li className="py-10 text-center text-sm text-muted-foreground">
              لم تُولَّد أي تقارير بعد.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
