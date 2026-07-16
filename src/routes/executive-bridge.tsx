// Executive Command Bridge — seven-chapter, bilingual board-room experience.
// Arabic-first RTL, English simultaneous secondary. ARIA narration is always
// user-initiated and uses the same canonical ElevenLabs identity as the copilot.
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { SimulationRibbon } from "@/components/SimulationRibbon";
import { ExecutiveSourceBadge } from "@/components/evidence/ExecutiveSourceBadge";
import { REGIONS, REGION_ACCENT_HEX } from "@/lib/regions";
import { regionSim } from "@/lib/sec/region-sim-data";
import { useExecutiveKpiSource } from "@/lib/sec/use-executive-kpi-source";
import {
  Activity,
  ArrowUpLeft,
  Bot,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Crown,
  Database,
  Eye,
  FileText,
  Gauge,
  HardHat,
  LockKeyhole,
  Mic2,
  Network,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Volume2,
  Wrench,
} from "lucide-react";
import {
  EXECUTIVE_BRIDGE_SCENES,
  executiveBridgeNarration,
  type ExecutiveBridgeAccent,
  type ExecutiveBridgeSceneCopy,
  type ExecutiveBridgeSceneId,
} from "@/lib/executive-bridge-content";

/* ─────────── Scene visuals — real fixture data, honestly «محاكاة»-badged
   (constitution art. 11 + 13.5). Compact glass instruments below each scene. */

const SIM_CHIP =
  "inline-flex items-center gap-1 rounded-full border border-[#3AE8FF]/35 bg-[#3AE8FF]/10 px-2 py-0.5 text-[9px] font-semibold text-[#3AE8FF]";

function bridgeAggregate() {
  const per = REGIONS.map((r) => ({ r, c: regionSim(r.id).counts }));
  const sum = (f: (c: (typeof per)[number]["c"]) => number) => per.reduce((a, x) => a + f(x.c), 0);
  const avg = (f: (c: (typeof per)[number]["c"]) => number) => Math.round(sum(f) / per.length);
  return { per, sum, avg };
}

function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[26px] border border-white/[0.12] bg-[#061A2E]/60 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-[#3AE8FF]/80 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#3AE8FF]/10 blur-3xl"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

// Scene 1 — Enterprise pulse: four aggregate KPIs across the regions.
function SceneEnterprisePulse() {
  const source = useExecutiveKpiSource();
  const live = source.data;
  const { sum, avg } = bridgeAggregate();
  const stats = [
    {
      ar: "الامتثال العام",
      en: "Compliance",
      v: `${live?.contractors_compliance ?? avg((c) => c.safety)}%`,
      tone: "#34D399",
      icon: Shield,
    },
    {
      ar: "بلاغات مفتوحة",
      en: "Open signals",
      v: String(live?.incidents_open ?? sum((c) => c.incidents_open)),
      tone: "#F5C560",
      icon: ShieldAlert,
    },
    {
      ar: "إشارات مرئية",
      en: "Vision signals",
      v: String(
        live ? Math.max(0, live.cameras_total - live.cameras_online) : sum((c) => c.cctv_new),
      ),
      tone: "#3AE8FF",
      icon: Eye,
    },
    {
      ar: "متوسط الجاهزية",
      en: "Readiness",
      v: `${live?.executive_readiness ?? avg((c) => c.readiness)}%`,
      tone: "#60A5FA",
      icon: Gauge,
    },
  ];
  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 sm:text-[11px]">
            نبض المؤسسة · Executive pulse
          </span>
        </div>
        <ExecutiveSourceBadge source={source} ar />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s, index) => {
          const Icon = s.icon;
          return (
            <div
              key={s.ar}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 text-right transition duration-500 hover:-translate-y-0.5 hover:border-white/20"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg border"
                  style={{ color: s.tone, borderColor: `${s.tone}55`, background: `${s.tone}12` }}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/35">
                  {s.en}
                </span>
              </div>
              <div
                className="text-xl font-black sm:text-2xl"
                style={{ color: s.tone, fontVariantNumeric: "tabular-nums" }}
              >
                {s.v}
              </div>
              <div className="mt-1 text-[10px] font-semibold leading-tight text-white/72">
                {s.ar}
              </div>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-px opacity-60"
                style={{ background: `linear-gradient(90deg,transparent,${s.tone},transparent)` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#3AE8FF]/20 bg-[#3AE8FF]/[0.055] px-3 py-2.5 text-right">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#3AE8FF]/12 text-[#3AE8FF] shadow-[0_0_22px_rgba(58,232,255,0.18)]">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black text-[#BEEBFF]">إشارة آريا التنفيذية</div>
          <div className="mt-0.5 text-[9.5px] leading-relaxed text-white/60 sm:text-[10.5px]">
            الأولوية الآن: خفض زمن إغلاق البلاغات الحرجة مع الحفاظ على مستوى الجاهزية.
          </div>
        </div>
        <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300 sm:block">
          قابل للتحقق
        </span>
      </div>
    </GlassPanel>
  );
}

// Scene 2 — One decision links Security ↔ Safety ↔ Maintenance.
function SceneDecisionLink() {
  const source = useExecutiveKpiSource();
  const live = source.data;
  const { sum } = bridgeAggregate();
  const nodes = [
    {
      ar: "الأمن",
      en: "Security",
      icon: Shield,
      v: live?.incidents_open ?? sum((c) => c.incidents_open),
      unit: "بلاغ",
    },
    {
      ar: "السلامة",
      en: "Safety",
      icon: HardHat,
      v: live?.sensors_alarming ?? sum((c) => c.cctv_new),
      unit: "تنبيه",
    },
    {
      ar: "الصيانة",
      en: "Maintenance",
      icon: Wrench,
      v: live?.wo_open ?? sum((c) => c.assets_offline),
      unit: "أصل",
    },
  ];
  const decisionRail = [
    { ar: "استشعار", en: "Sense" },
    { ar: "تحليل", en: "Analyze" },
    { ar: "توصية", en: "Recommend" },
    { ar: "اعتماد", en: "Authorize" },
    { ar: "تنفيذ", en: "Act" },
  ];
  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          مسار القرار المحكوم · Governed decision path
        </span>
        <ExecutiveSourceBadge source={source} ar />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {nodes.map((n, i) => {
          const Icon = n.icon;
          return (
            <div
              key={n.ar}
              className="relative flex items-center gap-2 overflow-hidden rounded-2xl border border-[#3AE8FF]/18 bg-[#3AE8FF]/[0.045] p-2.5 text-right sm:p-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#3AE8FF]/35 bg-[#3AE8FF]/10 text-[#3AE8FF] shadow-[0_0_18px_rgba(58,232,255,0.14)] sm:h-11 sm:w-11">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-white sm:text-[12px]">
                  {n.ar}
                </span>
                <span className="hidden text-[8px] uppercase tracking-wider text-white/35 sm:block">
                  {n.en}
                </span>
                <span
                  className="mt-0.5 block text-[9px] font-semibold text-[#BEEBFF] sm:text-[10px]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {n.v} {n.unit}
                </span>
              </div>
              <span className="absolute left-1.5 top-1.5 text-[8px] font-mono text-white/20">
                0{i + 1}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative mt-3 rounded-2xl border border-white/[0.08] bg-black/15 px-3 py-3">
        <div
          aria-hidden
          className="absolute left-[10%] right-[10%] top-[25px] h-px bg-gradient-to-r from-[#3AE8FF]/20 via-[#3AE8FF]/70 to-[#2FBF8F]/30"
        />
        <div className="relative grid grid-cols-5 gap-1">
          {decisionRail.map((step, index) => (
            <div key={step.en} className="flex flex-col items-center text-center">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border text-[9px] font-black ${
                  index === 3
                    ? "border-[#F5C560]/70 bg-[#F5C560]/15 text-[#F5C560] shadow-[0_0_16px_rgba(245,197,96,0.24)]"
                    : "border-[#3AE8FF]/45 bg-[#071C31] text-[#3AE8FF]"
                }`}
              >
                {index === 3 ? <Crown className="h-3 w-3" aria-hidden /> : index + 1}
              </span>
              <span className="mt-1.5 text-[9px] font-bold text-white/75 sm:text-[10px]">
                {step.ar}
              </span>
              <span className="hidden text-[7px] uppercase tracking-wider text-white/30 sm:block">
                {step.en}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-[9px] font-semibold text-[#F5C560]">
        <LockKeyhole className="h-3 w-3" aria-hidden />
        بوابة الاعتماد البشري إلزامية قبل التنفيذ
      </div>
    </GlassPanel>
  );
}

// Scene 3 — The four regional administrations on one board.
function SceneRegions() {
  const { per } = bridgeAggregate();
  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          الشبكة الوطنية · National operating grid
        </span>
        <span className={SIM_CHIP}>محاكاة</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {per.map(({ r, c }, index) => {
          const color = REGION_ACCENT_HEX[r.id];
          return (
            <div
              key={r.id}
              className="group relative overflow-hidden rounded-2xl border bg-white/[0.025] p-3 text-right transition duration-500 hover:-translate-y-1"
              style={{
                borderColor: `${color}42`,
                boxShadow: `inset 0 1px 0 ${color}15, 0 12px 34px ${color}0d`,
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-black text-white sm:text-[12px]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: color, boxShadow: `0 0 12px ${color}` }}
                  />
                  {r.shortAr}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color }}>
                  {r.shortEn}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-white/35">Readiness</div>
                  <div
                    className="text-2xl font-black sm:text-[28px]"
                    style={{ color, fontVariantNumeric: "tabular-nums" }}
                  >
                    {c.readiness}%
                  </div>
                </div>
                <Radio className="mb-1 h-5 w-5 opacity-45" style={{ color }} aria-hidden />
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${c.readiness}%`,
                    background: color,
                    boxShadow: `0 0 10px ${color}`,
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[8.5px] text-white/45">
                <span>{c.sites} موقع</span>
                <span>{c.incidents_open} بلاغ</span>
                <span>{c.patrols_active} دورية</span>
              </div>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-px"
                style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[9px] text-white/50">
        <span className="flex items-center gap-1.5">
          <Network className="h-3 w-3 text-[#3AE8FF]" aria-hidden /> سياق موحّد مع استقلال كل منطقة
        </span>
        <span className="hidden font-mono uppercase tracking-[0.16em] sm:block">
          ONE GRID · FOUR CONTEXTS
        </span>
      </div>
    </GlassPanel>
  );
}

// Scene 4 — ARIA executive agents at work.
function SceneAgents() {
  const agents = [
    { ar: "وكيل المخاطر", en: "Risk", icon: ShieldAlert, task: "فرز الإشارات" },
    { ar: "وكيل التقارير", en: "Reports", icon: FileText, task: "صياغة الموجز" },
    { ar: "وكيل العمليات", en: "Operations", icon: Activity, task: "تعيين المسؤول" },
    { ar: "وكيل الأدلة", en: "Evidence", icon: Database, task: "تحقق المصدر" },
  ];
  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          مجلس الوكلاء التنفيذي · ARIA agent council
        </span>
        <span className={SIM_CHIP}>محاكاة</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="grid grid-cols-2 gap-2">
          {agents.slice(0, 2).map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.ar}
                className="rounded-2xl border border-[#3AE8FF]/18 bg-[#3AE8FF]/[0.04] p-2.5 text-right"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#3AE8FF]/12 text-[#3AE8FF]">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> نشط
                  </span>
                </div>
                <div className="mt-2 truncate text-[10px] font-bold text-white">{a.ar}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/30">{a.en}</div>
                <div className="mt-1 text-[8.5px] text-white/48">{a.task}</div>
              </div>
            );
          })}
        </div>

        <div className="relative mx-auto grid h-28 w-28 place-items-center sm:h-32 sm:w-32">
          <div className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-[#3AE8FF]/35" />
          <div className="absolute inset-2 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-[#F5C560]/25" />
          <div className="absolute inset-5 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.92),rgba(58,232,255,0.55)_14%,rgba(11,47,85,0.92)_52%,rgba(3,17,31,0.96)_75%)] shadow-[0_0_38px_rgba(58,232,255,0.34)]" />
          <div className="relative text-center">
            <Bot className="mx-auto h-5 w-5 text-white" aria-hidden />
            <div className="mt-1 text-[11px] font-black text-white">آريا</div>
            <div className="text-[7px] font-bold uppercase tracking-[0.18em] text-[#3AE8FF]">
              Orchestrator
            </div>
          </div>
          <span
            aria-hidden
            className="absolute -left-2 top-1/2 h-px w-5 bg-gradient-to-r from-transparent to-[#3AE8FF]"
          />
          <span
            aria-hidden
            className="absolute -right-2 top-1/2 h-px w-5 bg-gradient-to-l from-transparent to-[#3AE8FF]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {agents.slice(2).map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.ar}
                className="rounded-2xl border border-[#3AE8FF]/18 bg-[#3AE8FF]/[0.04] p-2.5 text-right"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#3AE8FF]/12 text-[#3AE8FF]">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> نشط
                  </span>
                </div>
                <div className="mt-2 truncate text-[10px] font-bold text-white">{a.ar}</div>
                <div className="text-[8px] uppercase tracking-wider text-white/30">{a.en}</div>
                <div className="mt-1 text-[8.5px] text-white/48">{a.task}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.07] bg-black/15 p-2.5 text-center">
        {["دليل موثّق", "توصية مفسّرة", "اعتماد بشري"].map((label, index) => (
          <div
            key={label}
            className="flex items-center justify-center gap-1 text-[8.5px] font-semibold text-white/62 sm:text-[10px]"
          >
            <Check
              className={`h-3 w-3 ${index === 2 ? "text-[#F5C560]" : "text-emerald-300"}`}
              aria-hidden
            />{" "}
            {label}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

// Scene 5 — Live digital twin + executive reports.
function SceneTwinReports() {
  const { sum } = bridgeAggregate();
  const reports = ["موجز المجلس", "المخاطر", "العمليات", "الأثر"];
  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          التوأم التشغيلي · Operational twin
        </span>
        <span className={SIM_CHIP}>محاكاة</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-36 overflow-hidden rounded-2xl border border-[#3AE8FF]/18 bg-[#03111f]/55 p-3">
          <div
            aria-hidden
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                "linear-gradient(rgba(58,232,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(58,232,255,.12) 1px,transparent 1px)",
              backgroundSize: "24px 24px",
              maskImage: "linear-gradient(to bottom,black,transparent)",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#3AE8FF]/12 text-[#3AE8FF] shadow-[0_0_24px_rgba(58,232,255,0.17)]">
                <Boxes className="h-4 w-4" aria-hidden />
              </span>
              <div className="text-right">
                <div className="text-[11px] font-black text-white">نسيج الميدان الحي</div>
                <div className="text-[8px] uppercase tracking-[0.16em] text-white/35">
                  Field context mesh
                </div>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> متصل
            </span>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {[
              {
                label: "الميدان",
                value: sum((c) => c.contractors_active + c.patrols_active),
                unit: "فرد",
              },
              { label: "الأصول", value: sum((c) => c.cameras_total + c.gates_total), unit: "أصل" },
              { label: "المواقع", value: sum((c) => c.sites), unit: "موقع" },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-2 text-center"
              >
                <div
                  className="text-lg font-black text-[#BEEBFF]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {metric.value}
                </div>
                <div className="text-[8px] text-white/45">
                  {metric.label} · {metric.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.03] p-3 text-right">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black text-white">غرفة التقارير</div>
              <div className="text-[8px] uppercase tracking-wider text-white/32">
                Board-ready outputs
              </div>
            </div>
            <FileText className="h-4 w-4 text-[#F5C560]" aria-hidden />
          </div>
          <div className="mt-3 space-y-1.5">
            {reports.map((report, index) => (
              <div
                key={report}
                className="flex items-center justify-between rounded-xl border border-white/[0.065] bg-black/10 px-2.5 py-2"
              >
                <span className="flex items-center gap-2 text-[9px] font-semibold text-white/65">
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-[#3AE8FF]/10 text-[8px] font-mono text-[#3AE8FF]">
                    0{index + 1}
                  </span>
                  {report}
                </span>
                <ArrowUpLeft className="h-3 w-3 text-white/25" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#F5C560]/18 bg-[#F5C560]/[0.045] px-3 py-2 text-[9px] text-white/55">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#F5C560]" aria-hidden />
        آريا تربط كل خلاصة بمصدرها وتفصل الحقائق عن المحاكاة والتقدير.
      </div>
    </GlassPanel>
  );
}

function SceneSovereignTrust() {
  const pillars = [
    { ar: "صلاحيات دقيقة", en: "Least privilege", icon: LockKeyhole, color: "#3AE8FF" },
    { ar: "عزل بيانات", en: "Tenant isolation", icon: Database, color: "#60A5FA" },
    { ar: "أثر تدقيقي", en: "Audit trail", icon: FileText, color: "#34D399" },
    { ar: "قرار بشري", en: "Human authority", icon: Crown, color: "#F5C560" },
  ];
  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          معمار الثقة · Trust architecture
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/8 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
          <Shield className="h-3 w-3" aria-hidden /> حوكمة أصلية
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.en}
              className="relative overflow-hidden rounded-2xl border border-white/[0.085] bg-white/[0.028] p-3 text-right"
            >
              <div className="flex items-center justify-between">
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl border"
                  style={{
                    color: pillar.color,
                    borderColor: `${pillar.color}48`,
                    background: `${pillar.color}12`,
                    boxShadow: `0 0 20px ${pillar.color}12`,
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="font-mono text-[8px] text-white/20">0{index + 1}</span>
              </div>
              <div className="mt-3 text-[10px] font-black text-white sm:text-[11px]">
                {pillar.ar}
              </div>
              <div className="mt-0.5 text-[7.5px] font-bold uppercase tracking-wider text-white/32">
                {pillar.en}
              </div>
              <span
                aria-hidden
                className="absolute inset-x-4 bottom-0 h-px"
                style={{
                  background: `linear-gradient(90deg,transparent,${pillar.color},transparent)`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid gap-2 rounded-2xl border border-[#F5C560]/20 bg-[#F5C560]/[0.04] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-[#F5C560]/35 bg-[#F5C560]/10 text-[#F5C560] shadow-[0_0_28px_rgba(245,197,96,0.15)] sm:mx-0">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </span>
        <div className="text-center sm:text-right">
          <div className="text-[10px] font-black text-white">قاعدة آريا غير القابلة للتجاوز</div>
          <div className="mt-0.5 text-[9px] leading-relaxed text-white/52">
            لا إرسال، ولا تنفيذ، ولا تغيير حساس دون أمر صريح وصلاحية قابلة للتحقق.
          </div>
        </div>
        <span className="mx-auto inline-flex items-center gap-1 rounded-full border border-[#F5C560]/30 bg-[#F5C560]/8 px-2.5 py-1 text-[8.5px] font-bold text-[#F5C560] sm:mx-0">
          <Check className="h-3 w-3" aria-hidden /> HUMAN IN COMMAND
        </span>
      </div>
    </GlassPanel>
  );
}

export const Route = createFileRoute("/executive-bridge")({
  validateSearch: (s) =>
    z
      .object({
        p: z.coerce.number().int().min(0).max(6).optional(),
        lang: z.enum(["ar", "en"]).optional(),
      })
      .parse(s),
  head: () => ({
    meta: [
      { title: "جسر القيادة التنفيذي — نيكسيوس | Executive Command Bridge" },
      {
        name: "description",
        content:
          "إيجاز قيادي تفاعلي من سبعة فصول بصوت آريا — من نبض المؤسسة إلى قرار التفعيل. Seven-chapter ARIA-voiced executive command experience.",
      },
      { property: "og:title", content: "جسر القيادة التنفيذي — Executive Command Bridge" },
      {
        property: "og:description",
        content: "A board-room-grade, bilingual NEXIOS command experience narrated by ARIA.",
      },
    ],
  }),
  component: ExecutiveBridgePage,
});

/* ─────────── Scene content (both languages, always) ─────────── */

interface Scene extends ExecutiveBridgeSceneCopy {
  render?: () => React.ReactNode;
}

const SCENE_VISUALS: Record<ExecutiveBridgeSceneId, () => React.ReactNode> = {
  "command-pulse": () => <SceneEnterprisePulse />,
  "decision-engine": () => <SceneDecisionLink />,
  "regional-grid": () => <SceneRegions />,
  "aria-council": () => <SceneAgents />,
  "digital-twin": () => <SceneTwinReports />,
  "sovereign-trust": () => <SceneSovereignTrust />,
  activation: () => <ClosingCTA />,
};

const SCENES: Scene[] = EXECUTIVE_BRIDGE_SCENES.map((scene) => ({
  ...scene,
  render: SCENE_VISUALS[scene.id],
}));

type VoiceState = "idle" | "loading" | "playing" | "error";

/* ─────────── Page ─────────── */

function ExecutiveBridgePage() {
  const executiveSource = useExecutiveKpiSource();
  const search = useSearch({ from: "/executive-bridge" });
  const navigate = useNavigate({ from: "/executive-bridge" });
  const initial = Math.min(Math.max(search.p ?? 0, 0), SCENES.length - 1);
  const [idx, setIdx] = React.useState(initial);
  const [primary, setPrimary] = React.useState<"ar" | "en">(search.lang ?? "ar");
  const [narrating, setNarrating] = React.useState(false);
  const [narrationRun, setNarrationRun] = React.useState(0);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [voiceState, setVoiceState] = React.useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const reduced = usePrefersReducedMotion();
  const narrationAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // URL sync
  React.useEffect(() => {
    if (search.p !== idx || search.lang !== primary) {
      navigate({ search: { p: idx, lang: primary }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, primary]);

  const beginNarration = React.useCallback(() => {
    // This function is only called from click/tap/keydown handlers so audio
    // remains behind a real user gesture on iOS and Chromium.
    AriaAudioBus.unlock();
    setCompleted(false);
    setHasStarted(true);
    setVoiceError(null);
    setNarrationRun((run) => run + 1);
    setNarrating(true);
  }, []);

  const toggleNarration = React.useCallback(() => {
    if (narrating) {
      setNarrating(false);
      setVoiceState("idle");
      return;
    }
    beginNarration();
  }, [beginNarration, narrating]);

  // Continuous narration: ARIA reads the dedicated script for this chapter,
  // advances only after real audio ends, and never fakes voice with a timer.
  React.useEffect(() => {
    if (!narrating) {
      narrationAudioRef.current?.pause();
      narrationAudioRef.current = null;
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    let audio: HTMLAudioElement | null = null;
    let ownsBus = false;
    const scene = SCENES[idx];
    const text = executiveBridgeNarration(scene, primary);

    setProgress(0);
    setVoiceState("loading");
    setVoiceError(null);

    const advance = () => {
      if (cancelled) return;
      if (idx < SCENES.length - 1) setIdx(idx + 1);
      else {
        setNarrating(false);
        setCompleted(true);
      }
    };

    const fail = (message: string) => {
      if (cancelled) return;
      if (ownsBus) {
        AriaAudioBus.notifyStopped("chat-tts");
        AriaAudioBus.release("chat-tts");
        ownsBus = false;
      }
      setVoiceState("error");
      setVoiceError(message);
      setNarrating(false);
    };

    (async () => {
      try {
        const r = await fetch("/api/public/aria-tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!r.ok || cancelled) throw new Error(`tts ${r.status}`);
        const blob = await r.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        const a = new Audio(objectUrl);
        audio = a;
        a.preload = "auto";
        narrationAudioRef.current = a;

        const stopForPreemption = () => {
          ownsBus = false;
          a.pause();
          if (!cancelled) {
            setNarrating(false);
            setVoiceState("idle");
          }
        };

        ownsBus = AriaAudioBus.acquire("chat-tts", stopForPreemption);
        if (!ownsBus) throw new Error("voice channel unavailable");

        a.onplaying = () => {
          if (cancelled) return;
          setVoiceState("playing");
          AriaAudioBus.notifyPlaying("chat-tts", a);
        };
        a.ontimeupdate = () => {
          if (!cancelled && Number.isFinite(a.duration) && a.duration > 0) {
            setProgress(Math.min(1, a.currentTime / a.duration));
          }
        };
        a.onended = () => {
          if (cancelled) return;
          setProgress(1);
          setVoiceState("idle");
          if (ownsBus) {
            AriaAudioBus.notifyStopped("chat-tts");
            AriaAudioBus.release("chat-tts");
            ownsBus = false;
          }
          advance();
        };
        a.onerror = () => {
          fail(primary === "ar" ? "تعذّر تشغيل صوت آريا" : "ARIA voice playback failed");
        };
        await a.play();
      } catch (error) {
        console.error("[executive-bridge] ARIA narration", error);
        fail(
          primary === "ar"
            ? "صوت آريا غير متاح الآن — تحقق من إعداد ElevenLabs"
            : "ARIA voice is unavailable — check ElevenLabs configuration",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (audio) {
        audio.onplaying = null;
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
      }
      if (narrationAudioRef.current === audio) narrationAudioRef.current = null;
      if (ownsBus) {
        AriaAudioBus.notifyStopped("chat-tts");
        AriaAudioBus.release("chat-tts");
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [narrating, narrationRun, idx, primary]);

  const goTo = React.useCallback((next: number) => {
    setIdx(((next % SCENES.length) + SCENES.length) % SCENES.length);
    setProgress(0);
  }, []);

  // Keyboard
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        goTo(idx - 1); // RTL: → goes back
      else if (e.key === "ArrowLeft") goTo(idx + 1);
      else if (e.key === " ") {
        e.preventDefault();
        toggleNarration();
      } else if (e.key.toLowerCase() === "l") {
        setPrimary((p) => (p === "ar" ? "en" : "ar"));
      } else if (e.key === "Escape") {
        setNarrating(false);
        setVoiceState("idle");
        try {
          AriaAudioBus.stopAll();
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, goTo, toggleNarration]);

  // Swipe support
  const touchX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) < 40) return;
    // RTL: swipe left = next
    if (dx < 0) goTo(idx + 1);
    else goTo(idx - 1);
    touchX.current = null;
  };

  // Stop any audio on unmount / hide
  React.useEffect(() => {
    const stop = () => {
      setNarrating(false);
      setVoiceState("idle");
      try {
        AriaAudioBus.stopAll();
      } catch {
        /* noop */
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") stop();
    };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, []);

  const scene = SCENES[idx];
  const sceneSupportsLiveData = scene.id === "command-pulse" || scene.id === "decision-engine";
  const showSimulationRibbon = Boolean(
    scene.showSimRibbon && !(sceneSupportsLiveData && executiveSource.mode === "live"),
  );
  const isPrimaryAr = primary === "ar";
  const overallProgress = ((idx + progress) / SCENES.length) * 100;
  const accentHex =
    scene.accent === "gold" ? "#F5C560" : scene.accent === "emerald" ? "#2FBF8F" : "#3AE8FF";

  return (
    <div
      dir="rtl"
      lang="ar"
      className="fixed inset-0 z-[100] overflow-hidden bg-[#03111f] text-white select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {showSimulationRibbon && <SimulationRibbon />}

      <SkylineBackground reduced={reduced} accent={scene.accent} />
      <Scrim />

      {/* Top bar */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-4 pt-3 sm:px-8 sm:pt-5"
        style={{ marginTop: showSimulationRibbon ? 32 : 0 }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/75">
            <span className="h-2 w-2 rounded-full bg-[#F5C560] shadow-[0_0_12px_#F5C560]" />
            نيكسيوس · NEXIOS
          </div>
          <DateStamp />
        </div>
        <div className="pointer-events-auto absolute left-1/2 top-3 hidden -translate-x-1/2 sm:top-4 sm:block">
          <AriaVoiceBadge state={voiceState} language={primary} error={voiceError} />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <LanguageToggle primary={primary} onChange={setPrimary} />
          <span className="hidden text-[11px] font-mono text-white/60 sm:inline">
            {String(idx + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="pointer-events-none absolute inset-x-0 z-30 h-[2px] bg-white/10"
        style={{ top: showSimulationRibbon ? 100 : 76 }}
      >
        <div
          className="relative h-full bg-gradient-to-l from-[#F5C560] via-[#3AE8FF] to-[#00D4FF]"
          style={{
            width: `${overallProgress}%`,
            transition: reduced ? "none" : "width 180ms linear",
          }}
        >
          {/* Glowing leading head */}
          <span
            aria-hidden
            className="absolute -top-[3px] left-0 h-2 w-2 -translate-x-1/2 rounded-full bg-white"
            style={{ boxShadow: "0 0 12px 2px #3AE8FF, 0 0 4px #fff" }}
          />
        </div>
      </div>

      {/* Scenes */}
      <div className="relative z-20 flex h-full w-full items-center justify-center px-4 pb-28 pt-20 sm:px-10 sm:pb-32 sm:pt-24">
        {SCENES.map((s, i) => (
          <SceneLayer
            key={s.id}
            active={i === idx}
            reduced={reduced}
            scene={s}
            primary={isPrimaryAr ? "ar" : "en"}
            voiceState={voiceState}
            narrating={narrating}
            onToggleNarration={toggleNarration}
          />
        ))}
      </div>

      {/* Cross-scene transition — accent bloom + light sweep on every change */}
      {!reduced && (
        <div
          key={idx}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[25] overflow-hidden"
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(60% 50% at 50% 45%, ${accentHex}, transparent 70%)`,
              animation: "bridge-flash 640ms ease-out both",
            }}
          />
          <div
            className="absolute inset-y-0 w-2/3"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentHex}33, transparent)`,
              animation: "bridge-sweep 700ms ease-out both",
            }}
          />
          <style>{`
            @keyframes bridge-flash { 0% { opacity: 0.4; } 100% { opacity: 0; } }
            @keyframes bridge-sweep {
              0%   { transform: translateX(140%); opacity: 0; }
              25%  { opacity: 1; }
              100% { transform: translateX(-160%); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 pb-3 sm:gap-3 sm:pb-6">
        {!hasStarted && !completed && (
          <button
            type="button"
            onClick={beginNarration}
            className="group relative mb-1 inline-flex items-center gap-3 overflow-hidden rounded-full border border-[#3AE8FF]/35 bg-[#061A2E]/80 px-4 py-2 text-right shadow-[0_12px_45px_rgba(0,0,0,0.35),0_0_30px_rgba(58,232,255,0.12)] backdrop-blur-2xl transition duration-500 hover:-translate-y-0.5 hover:border-[#3AE8FF]/70 sm:px-5 sm:py-2.5"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3AE8FF]/12 text-[#3AE8FF] shadow-[0_0_24px_rgba(58,232,255,0.22)]">
              <Volume2 className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block text-[10px] font-black text-white sm:text-[11px]">
                ابدأ الإيجاز التنفيذي بصوت آريا
              </span>
              <span className="mt-0.5 hidden text-[8px] font-bold uppercase tracking-[0.16em] text-[#3AE8FF]/70 sm:block">
                Begin ARIA voice briefing
              </span>
            </span>
            <AriaWaveform active={false} />
            <span
              aria-hidden
              className="absolute inset-x-[18%] top-0 h-px bg-gradient-to-r from-transparent via-[#3AE8FF] to-transparent"
            />
          </button>
        )}
        <div className="flex items-center gap-2">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${s.kicker_ar} — ${s.kicker_en}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === idx
                  ? "w-8 bg-[#F5C560] shadow-[0_0_10px_#F5C560]"
                  : "w-2 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
        {completed && (
          <div
            role="status"
            className="rounded-full border border-[#F5C560]/60 bg-[#F5C560]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5C560]"
          >
            انتهت الجولة · Tour ended
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#020A12]/55 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:gap-2.5">
          <ControlBtn
            onClick={() => {
              setCompleted(false);
              goTo(idx - 1);
            }}
            label="السابق | Previous"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </ControlBtn>
          <ControlBtn
            onClick={toggleNarration}
            label={narrating ? "إيقاف صوت آريا | Stop ARIA" : "تشغيل صوت آريا | Play ARIA"}
            active={narrating}
          >
            {voiceState === "loading" ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
            ) : narrating ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4 fill-current" aria-hidden />
            )}
          </ControlBtn>

          <ControlBtn
            onClick={() => {
              setCompleted(false);
              goTo(idx + 1);
            }}
            label="التالي · تخطّي | Next · Skip"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </ControlBtn>
          <ControlBtn
            onClick={() => {
              AriaAudioBus.unlock();
              setCompleted(false);
              setHasStarted(true);
              setVoiceError(null);
              setProgress(0);
              setIdx(0);
              setNarrationRun((run) => run + 1);
              setNarrating(true);
            }}
            label="إعادة الجولة | Restart"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </ControlBtn>
          <a
            href="/"
            className="mr-0.5 rounded-full border border-white/15 bg-white/[0.035] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:border-[#F5C560]/60 hover:text-white sm:px-4 sm:text-[10px]"
          >
            خروج · Exit
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Scene layer ─────────── */

function SceneLayer({
  active,
  reduced,
  scene,
  primary,
  voiceState,
  narrating,
  onToggleNarration,
}: {
  active: boolean;
  reduced: boolean;
  scene: Scene;
  primary: "ar" | "en";
  voiceState: VoiceState;
  narrating: boolean;
  onToggleNarration: () => void;
}) {
  const accentColor =
    scene.accent === "gold" ? "#F5C560" : scene.accent === "emerald" ? "#2FBF8F" : "#3AE8FF";

  const arBig = primary === "ar";

  return (
    <div
      aria-hidden={!active}
      className="absolute inset-0 overflow-y-auto px-4 sm:px-10"
      style={{
        opacity: active ? 1 : 0,
        transform: reduced
          ? "none"
          : active
            ? "translateY(0) scale(1)"
            : "translateY(14px) scale(0.985)",
        filter: reduced ? "none" : active ? "blur(0)" : "blur(6px)",
        transition: reduced
          ? "opacity 0ms"
          : "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1), filter 700ms cubic-bezier(0.22,1,0.36,1)",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center py-28 pb-36 text-center sm:py-28 sm:pb-36">
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em]"
          style={{
            borderColor: `${accentColor}66`,
            color: accentColor,
            background: `${accentColor}14`,
            boxShadow: reduced ? "none" : `0 0 22px ${accentColor}33`,
          }}
        >
          <span>{scene.kicker_ar}</span>
          <span className="opacity-60">·</span>
          <span className="tracking-[0.2em]">{scene.kicker_en}</span>
        </div>

        {arBig ? (
          <>
            <h1
              dir="rtl"
              lang="ar"
              className="mx-auto max-w-3xl text-[25px] font-black leading-[1.2] tracking-tight text-white sm:text-[40px] sm:leading-[1.12]"
              style={{
                fontFamily: "'IBM Plex Sans Arabic','Tajawal',ui-sans-serif,system-ui",
                textShadow: "0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              {scene.title_ar}
            </h1>
            <h2
              dir="ltr"
              lang="en"
              className="mx-auto mt-2 max-w-3xl text-[13px] font-semibold leading-snug text-white/72 sm:text-[16px]"
              style={{ fontFamily: "'Space Grotesk',ui-sans-serif,system-ui" }}
            >
              {scene.title_en}
            </h2>
            <p
              dir="rtl"
              lang="ar"
              className="mx-auto mt-3 max-w-2xl text-[13px] leading-[1.85] text-white/86 sm:text-[15px]"
              style={{
                fontFamily: "'IBM Plex Sans Arabic','Tajawal',ui-sans-serif,system-ui",
                textShadow: "0 2px 12px rgba(0,0,0,0.6)",
              }}
            >
              {scene.body_ar}
            </p>
            <p
              dir="ltr"
              lang="en"
              className="mx-auto mt-1.5 max-w-2xl text-[10.5px] leading-[1.65] text-white/52 sm:text-[12px]"
              style={{ fontFamily: "'Space Grotesk',ui-sans-serif,system-ui" }}
            >
              {scene.body_en}
            </p>
          </>
        ) : (
          <>
            <h1
              dir="ltr"
              lang="en"
              className="mx-auto max-w-3xl text-[24px] font-black leading-[1.15] tracking-tight text-white sm:text-[38px]"
              style={{
                fontFamily: "'Space Grotesk',ui-sans-serif,system-ui",
                textShadow: "0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              {scene.title_en}
            </h1>
            <h2
              dir="rtl"
              lang="ar"
              className="mx-auto mt-2 max-w-3xl text-[14px] font-semibold leading-snug text-white/72 sm:text-[17px]"
              style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',ui-sans-serif,system-ui" }}
            >
              {scene.title_ar}
            </h2>
            <p
              dir="ltr"
              lang="en"
              className="mx-auto mt-3 max-w-2xl text-[13px] leading-[1.75] text-white/86 sm:text-[15px]"
              style={{ fontFamily: "'Space Grotesk',ui-sans-serif,system-ui" }}
            >
              {scene.body_en}
            </p>
            <p
              dir="rtl"
              lang="ar"
              className="mx-auto mt-1.5 max-w-2xl text-[11px] leading-[1.75] text-white/52 sm:text-[12.5px]"
              style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',ui-sans-serif,system-ui" }}
            >
              {scene.body_ar}
            </p>
          </>
        )}

        {scene.render && <div className="mt-5">{scene.render()}</div>}

        <div className="mt-3 flex items-center justify-center">
          <ListenButton
            lang={primary}
            state={voiceState}
            active={narrating}
            onToggle={onToggleNarration}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────── Bilingual language toggle ─────────── */

function LanguageToggle({
  primary,
  onChange,
}: {
  primary: "ar" | "en";
  onChange: (l: "ar" | "en") => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/45 p-0.5 backdrop-blur">
      <button
        type="button"
        onClick={() => onChange("ar")}
        aria-pressed={primary === "ar"}
        className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
          primary === "ar" ? "bg-[#F5C560] text-[#03111f]" : "text-white/75 hover:text-white"
        }`}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        aria-pressed={primary === "en"}
        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
          primary === "en" ? "bg-[#F5C560] text-[#03111f]" : "text-white/75 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}

/* ─────────── ARIA voice presence — one shared narration path ─────────── */

function AriaWaveform({ active }: { active: boolean }) {
  const bars = [7, 13, 9, 17, 11, 15, 8];
  return (
    <span className="inline-flex h-5 items-center gap-[2px]" aria-hidden>
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="bridge-voice-bar w-[2px] rounded-full bg-current"
          style={{
            height,
            opacity: active ? 0.95 : 0.42,
            animation: active
              ? `bridge-voice-bar 760ms ease-in-out ${index * 70}ms infinite alternate`
              : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes bridge-voice-bar {
          from { transform: scaleY(.42); opacity: .55; }
          to { transform: scaleY(1.16); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bridge-voice-bar { animation: none !important; }
        }
      `}</style>
    </span>
  );
}

function AriaVoiceBadge({
  state,
  language,
  error,
}: {
  state: VoiceState;
  language: "ar" | "en";
  error: string | null;
}) {
  const label =
    state === "loading"
      ? language === "ar"
        ? "آريا تُحضّر الإيجاز"
        : "ARIA is preparing"
      : state === "playing"
        ? language === "ar"
          ? "آريا تتحدث الآن"
          : "ARIA is speaking"
        : state === "error"
          ? language === "ar"
            ? "قناة الصوت تحتاج إعداداً"
            : "Voice channel needs setup"
          : language === "ar"
            ? "قناة آريا الصوتية"
            : "ARIA voice channel";

  return (
    <div
      role="status"
      title={error ?? undefined}
      className={`flex items-center gap-2.5 rounded-full border px-3 py-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition ${
        state === "error"
          ? "border-rose-400/30 bg-rose-400/[0.08] text-rose-300"
          : state === "playing"
            ? "border-[#3AE8FF]/45 bg-[#3AE8FF]/[0.09] text-[#3AE8FF]"
            : "border-white/[0.12] bg-[#041525]/70 text-white/55"
      }`}
    >
      <span className="relative grid h-7 w-7 place-items-center rounded-full border border-current/30 bg-current/[0.07]">
        <Mic2 className="h-3.5 w-3.5" aria-hidden />
        {state === "playing" && (
          <span className="absolute inset-0 animate-ping rounded-full border border-[#3AE8FF]/45" />
        )}
      </span>
      <span className="text-right">
        <span className="block text-[9px] font-black text-white/85">{label}</span>
        <span className="block text-[7px] font-bold uppercase tracking-[0.17em] opacity-60">
          Canonical ElevenLabs voice
        </span>
      </span>
      <AriaWaveform active={state === "playing"} />
    </div>
  );
}

function ListenButton({
  state,
  active,
  onToggle,
  lang,
}: {
  state: VoiceState;
  active: boolean;
  onToggle: () => void;
  lang: "ar" | "en";
}) {
  const label =
    state === "loading"
      ? lang === "ar"
        ? "جارٍ التحضير…"
        : "Preparing…"
      : active
        ? lang === "ar"
          ? "إيقاف صوت آريا"
          : "Stop ARIA voice"
        : state === "error"
          ? lang === "ar"
            ? "تعذّر التشغيل"
            : "Unavailable"
          : lang === "ar"
            ? "استمع بصوت آريا"
            : "Listen with ARIA";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] backdrop-blur transition sm:text-[10px] ${
        state === "error"
          ? "border-rose-400/35 bg-rose-400/[0.07] text-rose-300 hover:border-rose-300"
          : active
            ? "border-[#3AE8FF]/55 bg-[#3AE8FF]/10 text-white shadow-[0_0_26px_rgba(58,232,255,0.13)]"
            : "border-[#3AE8FF]/28 bg-black/30 text-[#3AE8FF] hover:border-[#3AE8FF]/70 hover:text-white"
      }`}
    >
      {state === "loading" ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : active ? (
        <CircleStop className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Volume2 className="h-3.5 w-3.5" aria-hidden />
      )}
      {label}
      <AriaWaveform active={state === "playing"} />
    </button>
  );
}

/* ─────────── Date stamp: Hijri + Gregorian ─────────── */

function DateStamp() {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="h-[14px]" />;
  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
  } catch {
    hijri = "";
  }
  const greg = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);
  return (
    <div
      className="flex items-center gap-2 text-[10px] font-medium text-white/55"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {hijri && <span dir="rtl">{hijri} هـ</span>}
      <span className="opacity-50">·</span>
      <span dir="ltr">{greg}</span>
    </div>
  );
}

function ClosingCTA() {
  const phases = [
    { day: "01–30", ar: "تحديد القرار", en: "Scope & baseline" },
    { day: "31–60", ar: "ربط وتشغيل", en: "Connect & operate" },
    { day: "61–90", ar: "قياس وتوسّع", en: "Prove & scale" },
  ];
  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          خارطة التفعيل · 90-day activation
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#F5C560]/30 bg-[#F5C560]/10 px-2 py-0.5 text-[9px] font-bold text-[#F5C560]">
          <Crown className="h-3 w-3" aria-hidden /> بقيادة تنفيذية
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {phases.map((phase, index) => (
          <div
            key={phase.day}
            className="relative overflow-hidden rounded-2xl border border-[#F5C560]/18 bg-[#F5C560]/[0.035] p-3 text-right"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-black text-[#F5C560]">{phase.day}</span>
              <span className="grid h-5 w-5 place-items-center rounded-full border border-[#F5C560]/35 text-[8px] font-black text-[#F5C560]">
                {index + 1}
              </span>
            </div>
            <div className="mt-3 text-[10px] font-black text-white sm:text-[12px]">{phase.ar}</div>
            <div className="mt-0.5 text-[7.5px] font-bold uppercase tracking-wider text-white/32 sm:text-[8px]">
              {phase.en}
            </div>
            <span
              aria-hidden
              className="absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F5C560]/70 to-transparent"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <a
          href="/book"
          className="group inline-flex items-center gap-2 rounded-full bg-[#F5C560] px-5 py-2.5 text-[10px] font-black text-[#03111f] shadow-[0_10px_34px_rgba(245,197,96,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(245,197,96,0.42)] sm:text-[11px]"
        >
          احجز جلسة القيادة
          <ArrowUpLeft
            className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </a>
        <a
          href="/contact"
          className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.035] px-5 py-2.5 text-[10px] font-bold text-white/70 transition hover:border-white/30 hover:text-white sm:text-[11px]"
        >
          تواصل مع فريق التفعيل · Contact
        </a>
      </div>
    </GlassPanel>
  );
}

/* ─────────── Background layers (reused from prior implementation) ─────────── */

function SkylineBackground({
  reduced,
  accent,
}: {
  reduced: boolean;
  accent: ExecutiveBridgeAccent;
}) {
  const skyTop = accent === "gold" ? "#1a1305" : accent === "emerald" ? "#031a17" : "#03111f";
  const skyMid = accent === "gold" ? "#3a2609" : accent === "emerald" ? "#0a3a2f" : "#0a2648";
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${skyTop} 0%, ${skyMid} 60%, #010812 100%)`,
          transition: reduced ? "none" : "background 900ms ease",
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.7), transparent 60%), radial-gradient(1px 1px at 60% 15%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(1.5px 1.5px at 80% 40%, rgba(255,255,255,0.7), transparent 60%), radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.4), transparent 60%)",
        }}
      />
      <div
        className={reduced ? "" : "bridge-aurora"}
        style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          height: "60vh",
          width: "80vw",
          transform: "translateX(-50%)",
          opacity: 0.4,
          filter: "blur(48px)",
          borderRadius: "9999px",
          background:
            accent === "gold"
              ? "radial-gradient(closest-side, rgba(245,197,96,0.55), transparent 70%)"
              : accent === "emerald"
                ? "radial-gradient(closest-side, rgba(47,191,143,0.45), transparent 70%)"
                : "radial-gradient(closest-side, rgba(58,232,255,0.4), transparent 70%)",
          transition: reduced ? "none" : "background 900ms ease",
        }}
      />
      {/* Secondary drifting aurora ribbon for depth */}
      <div
        aria-hidden
        className={reduced ? "" : "bridge-aurora2"}
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "30%",
          height: "50vh",
          width: "60vw",
          opacity: 0.22,
          filter: "blur(64px)",
          borderRadius: "9999px",
          background:
            accent === "gold"
              ? "radial-gradient(closest-side, rgba(245,197,96,0.4), transparent 70%)"
              : accent === "emerald"
                ? "radial-gradient(closest-side, rgba(47,191,143,0.4), transparent 70%)"
                : "radial-gradient(closest-side, rgba(0,212,255,0.4), transparent 70%)",
        }}
      />
      <style>{`
        .bridge-aurora { animation: bridge-aurora-drift 22s ease-in-out infinite; }
        .bridge-aurora2 { animation: bridge-aurora-drift2 28s ease-in-out infinite; }
        @keyframes bridge-aurora-drift {
          0%,100% { transform: translateX(-50%) translateY(0) scale(1); }
          50%     { transform: translateX(-50%) translateY(4%) scale(1.08); }
        }
        @keyframes bridge-aurora-drift2 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.18; }
          50%     { transform: translate(6%,-4%) scale(1.12); opacity: 0.28; }
        }
      `}</style>
    </div>
  );
}

function Scrim() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        background:
          "linear-gradient(180deg, rgba(3,17,31,0.35) 0%, rgba(3,17,31,0.10) 40%, rgba(3,17,31,0.80) 100%)",
      }}
    />
  );
}

function ControlBtn({
  children,
  onClick,
  label,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-white transition sm:h-10 sm:w-10 ${
        active
          ? "border-[#3AE8FF]/60 bg-[#3AE8FF]/12 text-[#3AE8FF] shadow-[0_0_22px_rgba(58,232,255,0.2)]"
          : "border-white/14 bg-white/[0.035] hover:border-[#F5C560]/55 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

/* ─────────── Reduced motion hook ─────────── */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}
