// وكيل التقارير — صفحة تشغيل وعرض التقارير المولّدة باستمرار.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildReport, toCsv, toPrintableHtml, type ReportRecord } from "@/lib/reports-agent/engine";

export const Route = createFileRoute("/reports-agent")({
  component: ReportsAgentPage,
  head: () => ({
    meta: [
      { title: "وكيل التقارير · سَدِيد Reports Agent" },
      {
        name: "description",
        content:
          "وكيل تقارير سَدِيد: يعمل باستمرار على توليد التقارير التشغيلية والامتثالية وتصديرها بصيغ CSV و PDF.",
      },
      { property: "og:title", content: "وكيل التقارير · سَدِيد Reports Agent" },
      {
        property: "og:description",
        content: "وكيل حي يولّد التقارير باستمرار داخل منظومة سَدِيد ويصدّرها بضغطة زر.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const INTERVAL_MS = 12_000; // دورة توليد جديدة كل 12 ثانية
const MAX_KEEP = 100;

function ReportsAgentPage() {
  const [running, setRunning] = useState(true);
  const [reports, setReports] = useState<ReportRecord[]>(() => [
    buildReport(),
    buildReport(),
    buildReport(),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setReports((prev) => [buildReport(), ...prev].slice(0, MAX_KEEP));
    }, INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );

  const generateNow = () => setReports((prev) => [buildReport(), ...prev].slice(0, MAX_KEEP));

  const exportCsv = () => {
    const blob = new Blob([toCsv(reports)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sadeed-reports-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(toPrintableHtml(reports));
    w.document.close();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#061A2E] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.3em] text-cyan-300/70">SADEED · AGENT</div>
            <h1 className="mt-1 text-3xl font-bold text-cyan-100 lg:text-4xl">وكيل التقارير</h1>
            <p className="mt-2 max-w-2xl text-sm text-cyan-100/70">
              وكيل حيّ يعمل باستمرار داخل منظومة سَدِيد لتوليد التقارير التشغيلية والامتثالية عبر
              المناطق والقطاعات، ويتيح تصديرها فورًا.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                running
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-400/40 bg-amber-500/10 text-amber-200"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}
              />
              {running ? "يعمل الآن" : "متوقّف"}
            </span>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="التقارير المولّدة" value={reports.length} />
          <Stat label="المناطق المغطاة" value={new Set(reports.map((r) => r.regionAr)).size} />
          <Stat label="الأنواع" value={new Set(reports.map((r) => r.kind)).size} />
          <Stat label="آخر دورة (ث)" value={Math.round(INTERVAL_MS / 1000)} />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setRunning((v) => !v)}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20"
          >
            {running ? "إيقاف الوكيل" : "تشغيل الوكيل"}
          </button>
          <button
            onClick={generateNow}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            توليد تقرير الآن
          </button>
          <button
            onClick={exportCsv}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            تصدير CSV
          </button>
          <button
            onClick={exportPdf}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            تصدير PDF (طباعة)
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
            <div className="max-h-[560px] overflow-auto">
              {reports.map((r) => {
                const active = selected?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`mb-2 block w-full rounded-xl border p-3 text-right transition ${
                      active
                        ? "border-cyan-400/60 bg-cyan-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-cyan-100">{r.titleAr}</div>
                      <div className="text-[12px] text-cyan-100/60">{r.id}</div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-cyan-100/60">
                      <span>{new Date(r.createdAt).toLocaleTimeString("ar-SA")}</span>
                      <span>·</span>
                      <span>{r.regionAr}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            {selected ? (
              <>
                <div className="text-xs text-cyan-300/70">{selected.id}</div>
                <h2 className="mt-1 text-xl font-bold text-cyan-100">{selected.titleAr}</h2>
                <div className="mt-1 text-xs text-cyan-100/60">
                  {new Date(selected.createdAt).toLocaleString("ar-SA")} · {selected.regionAr}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-cyan-100/80">
                  {selected.summaryAr}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {selected.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border border-white/10 bg-black/30 p-3 text-center"
                    >
                      <div className="text-[12px] text-cyan-100/60">{m.label}</div>
                      <div className="mt-1 text-lg font-bold text-cyan-200">{m.value}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-cyan-100/60">لا توجد تقارير بعد.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <div className="text-[12px] text-cyan-100/60">{label}</div>
      <div className="mt-1 text-2xl font-bold text-cyan-200">{value}</div>
    </div>
  );
}
