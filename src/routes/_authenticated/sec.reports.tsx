import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, FileSpreadsheet, Download, RefreshCw } from "lucide-react";
import {
  generateDailyOperationsReport,
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
};

function triggerDownload(file_name: string, mime_type: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime_type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file_name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function Reports() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);

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

  const genDaily = useServerFn(generateDailyOperationsReport);
  const mDaily = useMutation({
    mutationFn: () => genDaily({ data: { date: day } }),
    onSuccess: (res) => {
      triggerDownload(res.file_name, res.mime_type, res.base64);
      toast.success(`تم توليد ${res.file_name}`);
      qc.invalidateQueries({ queryKey: ["oms-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getUrl = useServerFn(getReportDownloadUrl);
  const openReport = async (report_id: string) => {
    try {
      const r = await getUrl({ data: { report_id } });
      if (r.url) window.open(r.url, "_blank", "noopener");
      else toast.error("الملف غير متاح في التخزين");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const list = (reports ?? []) as ReportRow[];

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="محرك التقارير"
        subtitle="تقارير حقيقية مولَّدة من بيانات العمليات (PDF · Excel)"
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
          <Button onClick={() => mDaily.mutate()} disabled={mDaily.isPending} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" />{" "}
            {mDaily.isPending ? "جارٍ التوليد…" : "توليد Excel"}
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
        <p className="mt-2 text-[11px] text-muted-foreground">
          يجمع البلاغات + أوامر العمل + التصاريح + الأحداث خلال 24 ساعة من التاريخ المحدد ويُحفظ في
          سجل التقارير.
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
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  <span className="uppercase">{r.kind}</span> · {r.format.toUpperCase()}
                  {r.related_entity_ref && (
                    <>
                      {" "}
                      · <span className="font-mono">{r.related_entity_ref}</span>
                    </>
                  )}
                  {r.size_bytes != null && (
                    <> · {Math.max(1, Math.round(r.size_bytes / 1024))} KB</>
                  )}
                  {r.generated_by_name && <> · {r.generated_by_name}</>}
                  <> · {new Date(r.created_at).toLocaleString("ar-SA")}</>
                </div>
              </div>
              {r.storage_path ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openReport(r.id)}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> تنزيل
                </Button>
              ) : (
                <span className="text-[10px] text-muted-foreground">غير محفوظ</span>
              )}
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
