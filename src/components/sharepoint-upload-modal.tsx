import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Cloud, X, Loader2, Eye, FileDown, Link2, Copy } from "lucide-react";
import { toast } from "sonner";
import { listSharePointSites, uploadReportToSharePoint } from "@/lib/sharepoint.functions";

export type KpisShape = {
  operationalSites: number;
  totalSites: number;
  activeIncidents: number;
  criticalCount: number;
  newCctv: number;
  activePatrols: number;
  visitorsInside: number;
  activePermits: number;
  avgResponse: number;
};

export function SharePointUploadModal({
  ar,
  html,
  kpis,
  onClose,
}: {
  ar: boolean;
  html: string;
  kpis: KpisShape;
  onClose: () => void;
}) {
  const listFn = useServerFn(listSharePointSites);
  const uploadFn = useServerFn(uploadReportToSharePoint);

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const fmtD = (d: Date) => d.toISOString().slice(0, 10);

  const [siteId, setSiteId] = useState("");
  const [title, setTitle] = useState(
    ar
      ? "تقرير غرفة القيادة — الأمن الصناعي (المنطقة الغربية)"
      : "Command Center Report — Industrial Security (Western Region)",
  );
  const [periodFrom, setPeriodFrom] = useState(fmtD(weekAgo));
  const [periodTo, setPeriodTo] = useState(fmtD(today));
  const [filename, setFilename] = useState(() =>
    ar ? `تقرير-غرفة-القيادة-${fmtD(today)}.pdf` : `command-center-report-${fmtD(today)}.pdf`,
  );
  const [includeKpis, setIncludeKpis] = useState(true);

  const [step, setStep] = useState<"form" | "preview" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [previewTab, setPreviewTab] = useState<"pdf" | "csv">("pdf");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfB64, setPdfB64] = useState<string>("");
  const [csvText, setCsvText] = useState<string>("");
  const [csvB64, setCsvB64] = useState<string>("");
  const [result, setResult] = useState<{
    webUrl: string;
    shareUrl: string | null;
    name: string;
  } | null>(null);

  const sites = useQuery({ queryKey: ["sp-sites"], queryFn: () => listFn({}), staleTime: 60_000 });

  useEffect(
    () => () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    },
    [pdfBlobUrl],
  );

  const buildHeaderHtml = (): string => {
    const periodLabel = ar
      ? `الفترة: ${periodFrom} → ${periodTo}`
      : `Period: ${periodFrom} → ${periodTo}`;
    const gen = ar
      ? `تم التوليد: ${new Date().toLocaleString("ar-SA")}`
      : `Generated: ${new Date().toLocaleString("en-US")}`;
    return `
      <div style="font-family:'Cairo','Tajawal',system-ui,sans-serif;direction:${ar ? "rtl" : "ltr"};padding:24px 32px;background:linear-gradient(135deg,#0b1220,#0f1a2e);color:#e2e8f0;border-bottom:2px solid #06b6d4;margin-bottom:16px;">
        <div style="font-size:11px;letter-spacing:.2em;color:#67e8f9;text-transform:uppercase;">NEXIOS · UNIFIED COMMAND CENTER</div>
        <h1 style="font-size:22px;margin:6px 0 4px;color:#f1f5f9;">${title.replace(/</g, "&lt;")}</h1>
        <div style="font-size:12px;color:#94a3b8;">${periodLabel} · ${gen}</div>
      </div>`;
  };

  const generatePdfBytes = async (): Promise<{ b64: string; blobUrl: string }> => {
    const jsPDFMod = await import("jspdf");
    const html2canvasMod = await import("html2canvas");
    const JsPDF = jsPDFMod.jsPDF || jsPDFMod.default;
    const html2canvas = html2canvasMod.default;

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-99999px;top:0;width:1024px;background:#0b1220;";
    host.innerHTML = buildHeaderHtml() + html;
    document.body.appendChild(host);
    try {
      const canvas = await html2canvas(host, { background: "#0b1220", scale: 1.5 } as Parameters<
        typeof html2canvas
      >[1]);
      const img = canvas.toDataURL("image/jpeg", 0.85);
      const pdf = new JsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 32;
      const imgH = (canvas.height * imgW) / canvas.width;
      let remaining = imgH;
      let offset = 0;
      while (remaining > 0) {
        pdf.addImage(img, "JPEG", 16, 16 - offset, imgW, imgH, undefined, "FAST");
        remaining -= pageH - 32;
        if (remaining > 0) {
          pdf.addPage();
          offset += pageH - 32;
        }
      }
      const blob = pdf.output("blob") as Blob;
      const blobUrl = URL.createObjectURL(blob);
      const dataUri = pdf.output("datauristring");
      const b64 = dataUri.split(",")[1] ?? "";
      return { b64, blobUrl };
    } finally {
      document.body.removeChild(host);
    }
  };

  const buildCsv = (): { text: string; b64: string } => {
    const rows: Array<Array<string | number>> = [
      ["metric", "value"],
      ["report_title", title],
      ["period_from", periodFrom],
      ["period_to", periodTo],
      ["operational_sites", `${kpis.operationalSites}/${kpis.totalSites}`],
      ["active_incidents", kpis.activeIncidents],
      ["critical_incidents", kpis.criticalCount],
      ["cctv_new_alerts", kpis.newCctv],
      ["active_patrols", kpis.activePatrols],
      ["visitors_inside", kpis.visitorsInside],
      ["active_permits", kpis.activePermits],
      ["avg_response_minutes", kpis.avgResponse],
      ["generated_at", new Date().toISOString()],
    ];
    const text = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const b64 = btoa(unescape(encodeURIComponent("\uFEFF" + text)));
    return { text, b64 };
  };

  const handlePreview = async () => {
    setBusy(true);
    try {
      toast.message(ar ? "جاري توليد المعاينة..." : "Generating preview...");
      const { b64, blobUrl } = await generatePdfBytes();
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfB64(b64);
      setPdfBlobUrl(blobUrl);
      const csv = buildCsv();
      setCsvText(csv.text);
      setCsvB64(csv.b64);
      setStep("preview");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    if (!siteId) {
      toast.error(ar ? "اختر موقع SharePoint" : "Pick a SharePoint site");
      return;
    }
    if (!pdfB64) {
      toast.error(ar ? "ولّد المعاينة أولاً" : "Generate preview first");
      return;
    }
    setBusy(true);
    try {
      const r = await uploadFn({
        data: {
          siteId,
          filename,
          contentType: "application/pdf",
          base64: pdfB64,
          createShareLink: true,
        },
      });
      if (includeKpis && csvB64) {
        await uploadFn({
          data: {
            siteId,
            filename: filename.replace(/\.pdf$/i, "") + "-kpis.csv",
            contentType: "text/csv",
            base64: csvB64,
            createShareLink: false,
          },
        });
      }
      setResult({ webUrl: r.webUrl, shareUrl: r.shareUrl, name: r.name });
      setStep("done");
      toast.success(ar ? "تم الرفع إلى SharePoint" : "Uploaded to SharePoint");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (u: string) => {
    try {
      await navigator.clipboard.writeText(u);
      toast.success(ar ? "تم نسخ الرابط" : "Link copied");
    } catch {
      /* noop */
    }
  };

  const downloadCsv = () => {
    const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.pdf$/i, "") + "-kpis.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${step === "preview" ? "max-w-5xl" : "max-w-lg"} max-h-[90vh] overflow-hidden rounded-2xl border border-sky-400/30 bg-slate-900/95 shadow-2xl flex flex-col`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-2 text-sky-200">
            <Cloud className="h-4 w-4" />
            <h3 className="text-sm font-semibold">
              {ar ? "رفع التقرير إلى SharePoint" : "Upload Report to SharePoint"}
            </h3>
            <span className="ms-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
              {step === "form"
                ? ar
                  ? "الإعدادات"
                  : "Setup"
                : step === "preview"
                  ? ar
                    ? "المعاينة"
                    : "Preview"
                  : ar
                    ? "تم"
                    : "Done"}
            </span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-auto p-5">
          {step === "form" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  {ar ? "الموقع" : "Site"}
                </label>
                {sites.isLoading ? (
                  <div className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />{" "}
                    {ar ? "جلب المواقع..." : "Loading sites..."}
                  </div>
                ) : sites.isError ? (
                  <div className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {ar ? "تعذّر جلب مواقع SharePoint" : "Could not load SharePoint sites"}
                  </div>
                ) : (
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="">— {ar ? "اختر موقعاً" : "Select a site"} —</option>
                    {sites.data?.sites?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName || s.webUrl}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  {ar ? "عنوان التقرير" : "Report title"}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={180}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    {ar ? "من تاريخ" : "Period from"}
                  </label>
                  <input
                    type="date"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    {ar ? "إلى تاريخ" : "Period to"}
                  </label>
                  <input
                    type="date"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  {ar ? "اسم الملف" : "Filename"}
                </label>
                <input
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeKpis}
                  onChange={(e) => setIncludeKpis(e.target.checked)}
                  className="accent-sky-500"
                />
                {ar ? "أرفق ملف KPIs بصيغة CSV" : "Attach KPIs as CSV"}
              </label>

              <div className="text-[11px] text-slate-500">
                {ar
                  ? "المسار: NEXIOS Reports/ — رابط مشاركة آمن داخل المؤسسة."
                  : "Folder: NEXIOS Reports/ — secure organization-scoped share link."}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                >
                  {ar ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handlePreview}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {ar ? "توليد المعاينة" : "Generate Preview"}
                </button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewTab("pdf")}
                  className={`rounded px-3 py-1 text-xs font-semibold ${previewTab === "pdf" ? "bg-sky-500 text-white" : "border border-slate-600 text-slate-300 hover:bg-slate-800"}`}
                >
                  PDF
                </button>
                <button
                  onClick={() => setPreviewTab("csv")}
                  className={`rounded px-3 py-1 text-xs font-semibold ${previewTab === "csv" ? "bg-sky-500 text-white" : "border border-slate-600 text-slate-300 hover:bg-slate-800"}`}
                >
                  KPIs.csv
                </button>
                <div className="flex-1" />
                {previewTab === "pdf" && pdfBlobUrl && (
                  <a
                    href={pdfBlobUrl}
                    download={filename}
                    className="inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                  >
                    <FileDown className="h-3 w-3" /> {ar ? "تنزيل PDF" : "Download PDF"}
                  </a>
                )}
                {previewTab === "csv" && (
                  <button
                    onClick={downloadCsv}
                    className="inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                  >
                    <FileDown className="h-3 w-3" /> {ar ? "تنزيل CSV" : "Download CSV"}
                  </button>
                )}
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-950">
                {previewTab === "pdf" ? (
                  pdfBlobUrl ? (
                    <iframe
                      title="PDF Preview"
                      src={pdfBlobUrl}
                      className="h-[65vh] w-full rounded-lg"
                    />
                  ) : (
                    <div className="flex h-[65vh] items-center justify-center text-xs text-slate-500">
                      {ar ? "لا توجد معاينة" : "No preview"}
                    </div>
                  )
                ) : (
                  <pre
                    className="h-[65vh] overflow-auto p-3 text-[11px] leading-relaxed text-slate-200"
                    dir="ltr"
                  >
                    {csvText}
                  </pre>
                )}
              </div>

              <div className="rounded border border-slate-700 bg-slate-800/40 px-3 py-2 text-[11px] text-slate-300">
                <span className="font-semibold text-slate-100">{ar ? "ملخص:" : "Summary:"}</span>{" "}
                {ar
                  ? `سيتم رفع ${includeKpis ? "ملفين" : "ملف واحد"} إلى الموقع المختار، مع إنشاء رابط مشاركة آمن.`
                  : `Will upload ${includeKpis ? "2 files" : "1 file"} to the selected site with a secure share link.`}
              </div>

              <div className="flex justify-between gap-2 pt-1">
                <button
                  onClick={() => setStep("form")}
                  disabled={busy}
                  className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  ← {ar ? "تعديل" : "Edit"}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={busy || !siteId}
                  className="inline-flex items-center gap-1.5 rounded bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Cloud className="h-3 w-3" />
                  )}
                  {ar ? "رفع الآن" : "Upload"}
                </button>
              </div>
            </div>
          )}

          {step === "done" && result && (
            <div className="space-y-3">
              <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                ✓ {result.name}
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-400">{ar ? "رابط الملف" : "File link"}</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={result.webUrl}
                    className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
                  />
                  <button
                    onClick={() => copyLink(result.webUrl)}
                    className="rounded border border-slate-600 p-1.5 text-slate-300 hover:bg-slate-800"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {result.shareUrl && (
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs text-sky-300">
                    <Link2 className="h-3 w-3" />{" "}
                    {ar ? "رابط المشاركة الآمن (المؤسسة)" : "Secure share link (organization)"}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={result.shareUrl}
                      className="flex-1 rounded border border-sky-700/60 bg-slate-800 px-2 py-1.5 text-xs text-sky-100"
                    />
                    <button
                      onClick={() => copyLink(result.shareUrl!)}
                      className="rounded border border-sky-600 p-1.5 text-sky-200 hover:bg-slate-800"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-600"
                >
                  {ar ? "تم" : "Done"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
