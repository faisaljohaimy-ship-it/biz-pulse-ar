/**
 * DigitalTwinSimulation — an interactive facility-map twin.
 *
 * SVG floor plan with animated sensors, cameras, and one moving incident.
 * The learner clicks an asset to see live-style telemetry; ARIA-style
 * recommendations pop for anomalies. Completing three inspections marks the
 * simulation as done.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cpu, Camera as CameraIcon, Thermometer, AlertOctagon, CheckCircle2, MapPin } from "lucide-react";
import { updateProgress } from "@/lib/learn/lessons.functions";
import { cn } from "@/lib/utils";

type AssetKind = "sensor" | "camera" | "incident";

interface Asset {
  id: string;
  kind: AssetKind;
  x: number;         // 0..100
  y: number;         // 0..100
  name_ar: string;
  name_en: string;
  reading_ar: string;
  reading_en: string;
  status: "ok" | "warn" | "critical";
  recommendation_ar?: string;
  recommendation_en?: string;
}

const ASSETS: Asset[] = [
  { id: "s1", kind: "sensor", x: 22, y: 28, name_ar: "حسّاس حرارة T-101", name_en: "Temp sensor T-101",
    reading_ar: "24.6 °C · طبيعي", reading_en: "24.6 °C · normal", status: "ok" },
  { id: "s2", kind: "sensor", x: 68, y: 34, name_ar: "حسّاس اهتزاز V-207", name_en: "Vibration V-207",
    reading_ar: "0.42 mm/s · متذبذب", reading_en: "0.42 mm/s · jittery", status: "warn",
    recommendation_ar: "تنبيه ARIA: النمط يطابق 71% من الأعطال السابقة. جدولة صيانة الليلة.",
    recommendation_en: "ARIA: pattern matches 71% of prior failures. Schedule maintenance tonight." },
  { id: "s3", kind: "sensor", x: 40, y: 72, name_ar: "حسّاس دخان S-08", name_en: "Smoke sensor S-08",
    reading_ar: "خالٍ", reading_en: "clear", status: "ok" },
  { id: "c1", kind: "camera", x: 80, y: 62, name_ar: "كاميرا CCTV-14", name_en: "CCTV-14",
    reading_ar: "بث مباشر · 30 fps", reading_en: "live · 30 fps", status: "ok" },
  { id: "c2", kind: "camera", x: 14, y: 60, name_ar: "كاميرا CCTV-03", name_en: "CCTV-03",
    reading_ar: "بثّ مقطوع 12 ثانية", reading_en: "feed lost 12 s ago", status: "critical",
    recommendation_ar: "تنبيه ARIA: احتمال 62% أن السبب انقطاع كابل. استدعاء صيانة IT.",
    recommendation_en: "ARIA: 62% cable fault likelihood. Dispatch IT maintenance." },
  { id: "i1", kind: "incident", x: 54, y: 50, name_ar: "حادث نشط: تسريب طفيف", name_en: "Live incident: minor leak",
    reading_ar: "5 دقائق منذ الاكتشاف · فريق في الطريق", reading_en: "5 min since detect · crew inbound", status: "critical",
    recommendation_ar: "ARIA: احتوى النموذج التوأمي التسرّب افتراضياً وأوصى بتحويل الحمل إلى الخط B.",
    recommendation_en: "ARIA: twin contained leak virtually and recommends load-shift to line B." },
];

interface Props {
  slug: string;
  lang: "ar" | "en";
  onCompleted?: () => void;
}

export function DigitalTwinSimulation({ slug, lang, onCompleted }: Props) {
  const ar = lang === "ar";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspected, setInspected] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const persist = useServerFn(updateProgress);

  // Small pulse tick so incident asset visibly breathes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 100), 900);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!completed && inspected.size >= 3) {
      setCompleted(true);
      persist({ data: { slug, simulation_completed: true } }).then(() => onCompleted?.()).catch(() => {});
    }
  }, [inspected, completed, persist, slug, onCompleted]);

  const selected = useMemo(() => ASSETS.find((a) => a.id === selectedId) ?? null, [selectedId]);

  return (
    <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between text-xs text-white/60">
        <div className="inline-flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-cyan-300" />
          {ar ? "توأم رقمي · موقع نيكسيوس - المنطقة الشمالية" : "Digital twin · Neexios Site — North Zone"}
        </div>
        <div className="tabular-nums">
          {ar ? `عناصر مفحوصة: ${inspected.size}/3` : `Inspected: ${inspected.size}/3`}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#04111F]">
        {/* Grid backdrop */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="block h-[380px] w-full">
          <defs>
            <pattern id="twin-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M8 0H0V8" fill="none" stroke="rgba(0,212,255,0.10)" strokeWidth="0.2" />
            </pattern>
            <radialGradient id="glow-critical" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(244,63,94,0.6)" />
              <stop offset="100%" stopColor="rgba(244,63,94,0)" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" fill="url(#twin-grid)" />
          {/* Building outlines */}
          <rect x="8" y="10" width="35" height="30" fill="rgba(0,212,255,0.04)" stroke="rgba(0,212,255,0.35)" strokeWidth="0.3" />
          <rect x="55" y="14" width="35" height="34" fill="rgba(0,212,255,0.04)" stroke="rgba(0,212,255,0.35)" strokeWidth="0.3" />
          <rect x="20" y="55" width="55" height="30" fill="rgba(0,212,255,0.04)" stroke="rgba(0,212,255,0.35)" strokeWidth="0.3" />
          {/* Assets */}
          {ASSETS.map((a) => {
            const size = a.kind === "incident" ? 3.5 + Math.sin(tick / 4) * 0.6 : 2.2;
            const color = a.status === "critical" ? "#f43f5e" : a.status === "warn" ? "#f59e0b" : "#22d3ee";
            return (
              <g key={a.id} className="cursor-pointer" onClick={() => { setSelectedId(a.id); setInspected((s) => new Set(s).add(a.id)); }}>
                {a.status === "critical" && (
                  <circle cx={a.x} cy={a.y} r={7} fill="url(#glow-critical)" />
                )}
                <circle cx={a.x} cy={a.y} r={size} fill={color} opacity={selectedId === a.id ? 1 : 0.85} />
                <circle cx={a.x} cy={a.y} r={size + 1.5} fill="none" stroke={color} strokeWidth={0.35} opacity={0.5} />
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="pointer-events-none absolute bottom-3 start-3 flex gap-3 rounded-lg bg-black/40 px-3 py-1.5 text-[10px] text-white/80 backdrop-blur">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400" />{ar ? "طبيعي" : "OK"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{ar ? "تحذير" : "Warn"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />{ar ? "حرج" : "Critical"}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        {/* Detail panel */}
        <div className="rounded-2xl border border-cyan-400/20 bg-[#0A1E33]/70 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            {ar ? "تفاصيل العنصر" : "Asset detail"}
          </div>
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                {selected.kind === "camera" ? <CameraIcon className="h-4 w-4 text-cyan-300" />
                 : selected.kind === "incident" ? <AlertOctagon className="h-4 w-4 text-rose-300" />
                 : <Thermometer className="h-4 w-4 text-cyan-300" />}
                {ar ? selected.name_ar : selected.name_en}
              </div>
              <div className={cn(
                "rounded-lg border p-2 text-xs",
                selected.status === "critical" && "border-rose-400/30 bg-rose-400/[0.06] text-rose-100",
                selected.status === "warn" && "border-amber-400/30 bg-amber-400/[0.06] text-amber-100",
                selected.status === "ok" && "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-100",
              )}>
                {ar ? selected.reading_ar : selected.reading_en}
              </div>
              {(selected.recommendation_ar || selected.recommendation_en) && (
                <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] p-2 text-xs text-cyan-100">
                  {ar ? selected.recommendation_ar : selected.recommendation_en}
                </div>
              )}
            </div>
          ) : (
            <div className="grid h-32 place-items-center text-sm text-white/50">
              <div className="text-center">
                <Cpu className="mx-auto mb-2 h-6 w-6 text-white/30" />
                {ar ? "انقر أي عنصر على الخريطة لبدء الفحص" : "Click any asset on the map to inspect"}
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/60">
            {ar ? "تقدّم المحاكاة" : "Simulation progress"}
          </div>
          <ul className="space-y-1.5 text-xs text-white/70">
            {ASSETS.slice(0, 5).map((a) => (
              <li key={a.id} className={cn("flex items-center gap-2", inspected.has(a.id) && "text-emerald-200")}>
                {inspected.has(a.id) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-white/20" />}
                {ar ? a.name_ar : a.name_en}
              </li>
            ))}
          </ul>
          {completed && (
            <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] p-2 text-xs text-emerald-100">
              {ar ? "أكملت جولة التوأم — تمّ حفظ التقدّم." : "Twin tour complete — progress saved."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
