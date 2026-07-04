import { useMemo, useState } from "react";
import {
  Shield,
  Radar,
  Brain,
  TrendingUp,
  AlertTriangle,
  Activity,
  Building2,
  Briefcase,
  Landmark,
  Crown,
  Gauge,
  Target,
  Zap,
  Eye,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";

type Mode = "ceo" | "board" | "investor" | "gov";

export default function WarRoomScene({ isAr }: { isAr: boolean }) {
  const [mode, setMode] = useState<Mode>("ceo");

  const modes: { id: Mode; en: string; ar: string; icon: any; tone: string; ring: string }[] = [
    { id: "ceo",      en: "CEO Mode",        ar: "وضع الرئيس التنفيذي", icon: Crown,    tone: "from-amber-300 to-amber-600",     ring: "ring-amber-300/60" },
    { id: "board",    en: "Board Mode",      ar: "وضع مجلس الإدارة",    icon: Briefcase, tone: "from-cyan-300 to-blue-600",       ring: "ring-cyan-300/60" },
    { id: "investor", en: "Investor Mode",   ar: "وضع المستثمرين",      icon: TrendingUp, tone: "from-emerald-300 to-emerald-600", ring: "ring-emerald-300/60" },
    { id: "gov",      en: "Government Mode", ar: "وضع الجهات الحكومية", icon: Landmark,  tone: "from-fuchsia-300 to-violet-600",  ring: "ring-fuchsia-300/60" },
  ];

  const cfg = useMemo(() => {
    switch (mode) {
      case "ceo":
        return {
          accent: "amber",
          kpis: [
            { en: "Enterprise Velocity", ar: "سرعة المؤسسة", value: "+38.4%", sub: "QoQ", tone: "text-amber-300" },
            { en: "Decision Throughput", ar: "إنتاجية القرار", value: "1,284/d", sub: "ARIA-assisted", tone: "text-white" },
            { en: "Strategic Alignment", ar: "المواءمة الاستراتيجية", value: "96.7%", sub: "OKR sync", tone: "text-emerald-300" },
            { en: "Cash Runway", ar: "السيولة التشغيلية", value: "42 mo", sub: "stable", tone: "text-white" },
          ],
          risks: [
            { sev: 82, en: "Talent attrition · engineering", ar: "تسرّب الكفاءات · الهندسة" },
            { sev: 64, en: "FX exposure · EUR / USD",        ar: "تذبذب العملات · يورو/دولار" },
            { sev: 47, en: "Supplier concentration · APAC",  ar: "تركّز الموردين · آسيا" },
          ],
          recs: [
            { en: "Approve $14.2M AI infra expansion",       ar: "اعتماد توسعة بنية الذكاء بـ ١٤٫٢ مليون" },
            { en: "Restructure top-12 enterprise accounts",  ar: "إعادة هيكلة أكبر ١٢ عميل مؤسسي" },
            { en: "Open second engineering hub · Riyadh",    ar: "افتتاح مركز هندسي ثانٍ · الرياض" },
          ],
          scenarios: [
            { p: 68, en: "Base growth · +24% ARR",      ar: "نمو أساسي · +٢٤٪ إيرادات متكررة" },
            { p: 22, en: "Aggressive M&A · +41% ARR",   ar: "استحواذ هجومي · +٤١٪" },
            { p: 10, en: "Defensive hold · +9% ARR",    ar: "تحفّظ دفاعي · +٩٪" },
          ],
        };
      case "board":
        return {
          accent: "cyan",
          kpis: [
            { en: "Governance Score",  ar: "حوكمة المؤسسة", value: "A+",   sub: "PDPL · NCA ECC", tone: "text-cyan-300" },
            { en: "Audit Readiness",   ar: "جاهزية التدقيق", value: "100%", sub: "Q3 close",         tone: "text-emerald-300" },
            { en: "Board Pack Sync",   ar: "ملف المجلس",     value: "Live", sub: "ARIA-curated",     tone: "text-white" },
            { en: "Risk Posture",      ar: "وضع المخاطر",    value: "Low",  sub: "↓ 18% YoY",        tone: "text-emerald-300" },
          ],
          risks: [
            { sev: 71, en: "Regulatory · KSA Data Law",      ar: "تنظيمي · نظام حماية البيانات" },
            { sev: 55, en: "Cyber exposure · 3rd-party",      ar: "أمن سيبراني · أطراف ثالثة" },
            { sev: 38, en: "ESG disclosure delta",            ar: "فجوة الإفصاح البيئي والاجتماعي" },
          ],
          recs: [
            { en: "Ratify new Audit Committee charter",       ar: "اعتماد ميثاق لجنة التدقيق الجديد" },
            { en: "Approve dual-class share buyback",         ar: "إقرار إعادة شراء الأسهم" },
            { en: "Adopt AI Ethics framework v2",             ar: "تبني إطار أخلاقيات الذكاء v2" },
          ],
          scenarios: [
            { p: 74, en: "Steady governance · stable returns", ar: "حوكمة مستقرة · عوائد ثابتة" },
            { p: 18, en: "Activist scenario · mitigated",      ar: "سيناريو ناشط · مُحتوى" },
            { p: 8,  en: "Crisis playbook · ready",            ar: "خطة الأزمات · جاهزة" },
          ],
        };
      case "investor":
        return {
          accent: "emerald",
          kpis: [
            { en: "ARR",            ar: "إيرادات متكررة سنوية", value: "$184M", sub: "+62% YoY",  tone: "text-emerald-300" },
            { en: "Gross Margin",   ar: "هامش الربح الإجمالي",  value: "84.2%", sub: "SaaS-grade", tone: "text-emerald-300" },
            { en: "Net Revenue Retention", ar: "احتفاظ صافي الإيراد", value: "138%", sub: "best-in-class", tone: "text-white" },
            { en: "Rule of 40",     ar: "قاعدة الـ ٤٠",         value: "71",    sub: "elite",     tone: "text-amber-300" },
          ],
          risks: [
            { sev: 58, en: "Valuation compression · sector",   ar: "ضغط التقييم · القطاع" },
            { sev: 44, en: "CAC payback drift",                 ar: "انجراف فترة استرداد الاستحواذ" },
            { sev: 32, en: "Concentration · top-3 logos",       ar: "تركّز · أكبر ٣ عملاء" },
          ],
          recs: [
            { en: "Open Series C · $220M @ $2.1B",             ar: "فتح جولة C بـ ٢٢٠م عند ٢٫١ مليار" },
            { en: "Expand EMEA · 3 enterprise wins pending",    ar: "توسعة أوروبا · ٣ صفقات مؤسسية" },
            { en: "Launch developer-tier · viral motion",       ar: "إطلاق طبقة المطوّرين · انتشار" },
          ],
          scenarios: [
            { p: 64, en: "IPO window · 2027",                   ar: "نافذة الإدراج · ٢٠٢٧" },
            { p: 26, en: "Strategic acquisition · $3.4B",       ar: "استحواذ استراتيجي · ٣٫٤ مليار" },
            { p: 10, en: "Secondary tender · partial",          ar: "بيع ثانوي · جزئي" },
          ],
        };
      case "gov":
        return {
          accent: "fuchsia",
          kpis: [
            { en: "Vision 2030 Alignment", ar: "مواءمة رؤية ٢٠٣٠", value: "98%",  sub: "12 pillars", tone: "text-fuchsia-300" },
            { en: "Sovereign Data Locality", ar: "السيادة الرقمية", value: "100%", sub: "KSA region", tone: "text-emerald-300" },
            { en: "Citizen Impact Index",  ar: "أثر المواطن",      value: "A1",   sub: "national",   tone: "text-white" },
            { en: "Public Trust Score",    ar: "ثقة الجمهور",      value: "92.4", sub: "↑ 6.1",      tone: "text-emerald-300" },
          ],
          risks: [
            { sev: 69, en: "Cross-border data transfer",       ar: "نقل البيانات عبر الحدود" },
            { sev: 51, en: "Critical infra dependency",         ar: "تبعية البنية التحتية الحرجة" },
            { sev: 36, en: "Disinformation surface",            ar: "سطح المعلومات المضللة" },
          ],
          recs: [
            { en: "Federate AI with national identity layer",   ar: "ربط الذكاء بمنظومة الهوية الوطنية" },
            { en: "Pilot AI in 3 mega-projects · NEOM, Qiddiya, Diriyah", ar: "تجربة الذكاء في ٣ مشاريع كبرى" },
            { en: "Establish Sovereign AI Council",             ar: "تأسيس مجلس الذكاء السيادي" },
          ],
          scenarios: [
            { p: 70, en: "National rollout · 18 ministries",    ar: "تفعيل وطني · ١٨ وزارة" },
            { p: 22, en: "GCC expansion · 4 nations",           ar: "توسعة خليجية · ٤ دول" },
            { p: 8,  en: "Global SaaS-for-Gov play",            ar: "خدمة حكومية عالمية" },
          ],
        };
    }
  }, [mode]);

  const accentMap: Record<string, { text: string; bg: string; ring: string; glow: string }> = {
    amber:   { text: "text-amber-300",   bg: "bg-amber-400/10",   ring: "ring-amber-300/40",   glow: "shadow-[0_0_80px_-20px_rgba(245,180,84,0.7)]" },
    cyan:    { text: "text-cyan-300",    bg: "bg-cyan-400/10",    ring: "ring-cyan-300/40",    glow: "shadow-[0_0_80px_-20px_rgba(56,189,248,0.7)]" },
    emerald: { text: "text-emerald-300", bg: "bg-emerald-400/10", ring: "ring-emerald-300/40", glow: "shadow-[0_0_80px_-20px_rgba(52,211,153,0.7)]" },
    fuchsia: { text: "text-fuchsia-300", bg: "bg-fuchsia-400/10", ring: "ring-fuchsia-300/40", glow: "shadow-[0_0_80px_-20px_rgba(232,121,249,0.7)]" },
  };
  const a = accentMap[cfg.accent];

  return (
    <section
      data-scene="war-room"
      dir={isAr ? "rtl" : "ltr"}
      className="relative min-h-[100svh] overflow-hidden bg-[#03050c] py-24"
    >
      {/* tactical grid + scanlines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 40%, transparent 78%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(245,180,84,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0_1px,transparent_1px_3px)]" />

      <div className="relative mx-auto max-w-7xl px-5">
        {/* header */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border ${a.ring} ${a.bg} px-3 py-1 text-[10px] uppercase tracking-[0.32em] ${a.text} backdrop-blur-md ring-1`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              {isAr ? "غرفة القيادة التنفيذية · مباشر" : "Executive War Room · LIVE"}
            </div>
            <h2 className="mt-4 text-4xl font-bold leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {isAr ? (
                <>غرفة <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">القيادة</span> التنفيذية</>
              ) : (
                <>Executive <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">War Room</span></>
              )}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
              {isAr
                ? "مركز قيادة استراتيجي لصنّاع القرار — مخاطر حية، توصيات ذكية، وسيناريوهات مستقبلية في الوقت الحقيقي."
                : "A strategic command center for decision-makers — live risks, AI recommendations and future scenarios in real time."}
            </p>
          </div>

          {/* mode switch */}
          <div className="flex flex-wrap items-center gap-2">
            {modes.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
                    active
                      ? `border-transparent bg-gradient-to-r ${m.tone} text-black shadow-[0_8px_40px_-10px_rgba(255,255,255,0.4)] ring-2 ${m.ring}`
                      : "border-white/15 bg-white/[0.04] text-white/65 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{isAr ? m.ar : m.en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* main holographic surface */}
        <div className={`relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-2xl ${a.glow} sm:p-7`}>
          {/* top status strip */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 text-[10px] uppercase tracking-[0.3em] text-white/45">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> {isAr ? "الذكاء التشغيلي · متصل" : "Ops Intel · Online"}</span>
              <span className="hidden md:inline">{isAr ? "زمن الاستجابة · ١٢ مللي" : "Latency · 12ms"}</span>
              <span className="hidden md:inline">{isAr ? "إشارات / ث · ٤٨٬٢١٠" : "Signals/s · 48,210"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className={`h-3.5 w-3.5 ${a.text}`} />
              <span>{isAr ? "أريا · تحلّل" : "ARIA · Analyzing"}</span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            {/* LEFT — Executive KPIs */}
            <div className="lg:col-span-4 space-y-3">
              <SectionHead icon={Gauge} accent={a.text} label={isAr ? "مؤشرات الأداء التنفيذية" : "Executive KPIs"} />
              <div className="grid grid-cols-2 gap-3">
                {cfg.kpis.map((k, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
                    <div className="text-[9px] uppercase tracking-[0.24em] text-white/45">{isAr ? k.ar : k.en}</div>
                    <div className={`mt-2 text-2xl font-bold ${k.tone}`}>{k.value}</div>
                    <div className="mt-1 text-[10px] text-white/40">{k.sub}</div>
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full w-3/4 bg-gradient-to-r from-white/20 to-white/60`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* strategic decisions */}
              <div className="mt-4">
                <SectionHead icon={Target} accent={a.text} label={isAr ? "القرارات الاستراتيجية" : "Strategic Decisions"} />
                <ul className="mt-3 space-y-2">
                  {cfg.recs.map((r, i) => (
                    <li key={i} className="group flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.07]">
                      <div className={`mt-0.5 h-5 w-5 shrink-0 rounded-md ${a.bg} ${a.text} flex items-center justify-center`}>
                        <Zap className="h-3 w-3" />
                      </div>
                      <span className="text-[12px] leading-snug text-white/85">{isAr ? r.ar : r.en}</span>
                      <ChevronRight className={`ms-auto h-3.5 w-3.5 text-white/30 transition group-hover:translate-x-0.5 ${isAr ? "rotate-180 group-hover:-translate-x-0.5" : ""}`} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CENTER — Live risk radar */}
            <div className="lg:col-span-4">
              <SectionHead icon={Radar} accent={a.text} label={isAr ? "رادار المخاطر الحيّة" : "Live Risk Radar"} />
              <div className="relative mt-3 aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]">
                {/* radar rings */}
                {[0.95, 0.72, 0.5, 0.28].map((s, i) => (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 rounded-full border border-white/10"
                    style={{ width: `${s * 100}%`, height: `${s * 100}%`, transform: "translate(-50%,-50%)" }}
                  />
                ))}
                {/* crosshairs */}
                <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
                <div className="absolute left-0 top-1/2 h-px w-full bg-white/10" />
                {/* sweep */}
                <div
                  className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left"
                  style={{
                    background: `conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.22) 30deg, transparent 60deg)`,
                    animation: "wr-sweep 4.5s linear infinite",
                    transformOrigin: "0% 0%",
                  }}
                />
                {/* threat blips */}
                {cfg.risks.map((r, i) => {
                  const angle = (i / cfg.risks.length) * Math.PI * 2 + 0.6;
                  const radius = 30 + r.sev * 0.35;
                  const x = 50 + Math.cos(angle) * (radius / 2.4);
                  const y = 50 + Math.sin(angle) * (radius / 2.4);
                  const color = r.sev > 70 ? "bg-rose-400" : r.sev > 50 ? "bg-amber-300" : "bg-emerald-300";
                  return (
                    <div key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-70`} />
                        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
                      </span>
                    </div>
                  );
                })}
                {/* center core */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className={`text-[9px] uppercase tracking-[0.3em] ${a.text}`}>{isAr ? "أريا" : "ARIA"}</div>
                  <div className="text-[10px] text-white/55">{isAr ? "نواة القيادة" : "Command Core"}</div>
                </div>
              </div>

              {/* risk list */}
              <div className="mt-3 space-y-2">
                {cfg.risks.map((r, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-2 text-white/85">
                        <AlertTriangle className={`h-3.5 w-3.5 ${r.sev > 70 ? "text-rose-400" : r.sev > 50 ? "text-amber-300" : "text-emerald-300"}`} />
                        {isAr ? r.ar : r.en}
                      </span>
                      <span className="text-white/45">{r.sev}</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full ${r.sev > 70 ? "bg-rose-400" : r.sev > 50 ? "bg-amber-300" : "bg-emerald-300"}`}
                        style={{ width: `${r.sev}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Future scenarios + AI brief */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <SectionHead icon={Brain} accent={a.text} label={isAr ? "توصيات أريا الذكية" : "ARIA Recommendations"} />
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                    {isAr ? "موجز تنفيذي · مباشر" : "Executive Brief · Live"}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/85">
                    {isAr
                      ? "بناءً على ٤٨٬٢١٠ إشارة/ث وتحليل ١٢ سيناريو، توصي أريا بتسريع التوسعة الإقليمية مع تحوّط نسبي للعملة والحفاظ على هامش تشغيلي ≥ ٢٨٪."
                      : "From 48,210 signals/s across 12 modeled scenarios, ARIA advises accelerating regional expansion with partial FX hedging while preserving operating margin ≥ 28%."}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-white/45">
                    <Activity className={`h-3.5 w-3.5 ${a.text}`} />
                    <span>{isAr ? "ثقة النموذج · ٩٤٫٢٪" : "Model confidence · 94.2%"}</span>
                  </div>
                </div>
              </div>

              <div>
                <SectionHead icon={TrendingUp} accent={a.text} label={isAr ? "السيناريوهات المستقبلية" : "Future Scenarios"} />
                <div className="mt-3 space-y-2">
                  {cfg.scenarios.map((s, i) => (
                    <div key={i} className="group rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.07]">
                      <div className="flex items-center justify-between text-[11px] text-white/85">
                        <span className="flex items-center gap-2">
                          <ArrowUpRight className={`h-3.5 w-3.5 ${a.text}`} />
                          {isAr ? s.ar : s.en}
                        </span>
                        <span className={`font-semibold ${a.text}`}>{s.p}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full bg-gradient-to-r from-white/30 to-white/80`}
                          style={{ width: `${s.p}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${a.text}`} />
                    <span className="text-[11px] uppercase tracking-[0.24em] text-white/65">
                      {isAr ? "الوضع الأمني" : "Security Posture"}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300">{isAr ? "آمن" : "Secure"}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { v: "0", l: isAr ? "خروقات" : "Breaches" },
                    { v: "ISO27k", l: isAr ? "اعتماد" : "Certified" },
                    { v: "24/7", l: isAr ? "مراقبة" : "Monitored" },
                  ].map((x, i) => (
                    <div key={i} className="rounded-lg bg-white/[0.04] p-2">
                      <div className="text-[12px] font-bold text-white">{x.v}</div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* bottom ticker */}
          <div className="mt-6 flex items-center gap-3 overflow-hidden border-t border-white/10 pt-4 text-[10px] uppercase tracking-[0.28em] text-white/45">
            <Building2 className={`h-3.5 w-3.5 ${a.text}`} />
            <div className="relative flex-1 overflow-hidden">
              <div className="flex gap-10 whitespace-nowrap" style={{ animation: "wr-ticker 32s linear infinite" }}>
                {[
                  isAr ? "صفقة مؤسسية · ٤٢ مليون" : "Enterprise deal · $42M",
                  isAr ? "تنبيه تنظيمي · أوروبا" : "Regulatory alert · EU",
                  isAr ? "ترقية ائتمان · A+" : "Credit upgrade · A+",
                  isAr ? "افتتاح مركز · الرياض" : "New hub · Riyadh",
                  isAr ? "توقيع شراكة · حكومية" : "Government partnership signed",
                  isAr ? "تحوّط عملة · مكتمل" : "FX hedge · complete",
                ].concat([
                  isAr ? "صفقة مؤسسية · ٤٢ مليون" : "Enterprise deal · $42M",
                  isAr ? "تنبيه تنظيمي · أوروبا" : "Regulatory alert · EU",
                  isAr ? "ترقية ائتمان · A+" : "Credit upgrade · A+",
                ]).map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wr-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wr-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </section>
  );
}

function SectionHead({ icon: Icon, accent, label }: { icon: any; accent: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${accent}`} />
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/55">{label}</span>
      <div className="ms-2 h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
    </div>
  );
}
