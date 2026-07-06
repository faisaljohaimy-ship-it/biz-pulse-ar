/**
 * HajjExecutiveStage — منصة إنجاز الأعمال التنفيذية
 *
 * Split-screen cinematic stage:
 *  • Right (RTL primary): Hajj operations module preview with a Vision 2030
 *    "gem" anchor — links into the live Hajj module.
 *  • Left: digital integration constellation (Outlook · SAP · Windows 365)
 *    pulsing into a central executive hub, signalling end-to-end integration
 *    and an enterprise-grade ($B+) posture.
 *
 * Pure presentation — no auth, no protected calls. Safe on public landing.
 */
import { Mail, Database, Monitor, ShieldCheck, Sparkles, Moon, ArrowUpRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { HajjExecDrawer } from "@/components/hajj/HajjExecDrawer";
import { useI18n } from "@/lib/i18n";




const INTEGRATIONS = [
  { icon: Mail,     label_ar: "Outlook",      label_en: "Microsoft Outlook", hue: "#22c1ff" },
  { icon: Database, label_ar: "SAP",          label_en: "SAP S/4HANA",       hue: "#3AE8FF" },
  { icon: Monitor,  label_ar: "Windows 365",  label_en: "Windows 365",       hue: "#7dd3fc" },
] as const;

export function HajjExecutiveStage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const startLongPress = () => {
    longPressFired.current = false;
    if (typeof window === "undefined") return;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      void navigate({ to: "/hajj-prime" });
    }, 600);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const heading = ar ? "منصة إنجاز الأعمال التنفيذية" : "Executive Delivery Platform";
  const sub = ar
    ? "تكامل رقمي كامل بين عمليات الحج، أنظمة المؤسسة، والذكاء التنفيذي — لوحة قيادة واحدة تربط Outlook، SAP، و Windows 365 مع منظومة وكلاء آريا."
    : "End-to-end digital integration between Hajj operations, enterprise systems, and executive intelligence — a single cockpit linking Outlook, SAP, and Windows 365 with ARIA's agent fabric.";

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={heading}
      className="relative mx-auto mt-10 w-full max-w-6xl px-4 sm:mt-14 sm:px-6"
    >
      <style>{`
        @keyframes hes-gem-rotate { to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes hes-gem-glow { 0%,100% { filter: drop-shadow(0 0 18px rgba(58,232,255,0.55)); } 50% { filter: drop-shadow(0 0 38px rgba(58,232,255,0.95)); } }
        @keyframes hes-flow { to { stroke-dashoffset: -120; } }
        @keyframes hes-pulse { 0%,100% { opacity:.55; transform: scale(1); } 50% { opacity:1; transform: scale(1.05); } }
        @keyframes hes-orbit { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .hes-anim, .hes-anim * { animation: none !important; } }
      `}</style>

      <header className="mb-5 text-center sm:mb-7">
        <div className="text-[10px] uppercase tracking-[0.32em] text-[#3AE8FF]/80 sm:text-[11px]">
          Executive Delivery Platform · Vision 2030
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-white/60 sm:text-sm">{sub}</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:mb-8">
        <button
          type="button"
          onClick={() => { if (!longPressFired.current) setDrawerOpen(true); }}
          onContextMenu={(e) => { e.preventDefault(); void navigate({ to: "/hajj-prime" }); }}
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
          aria-label={ar ? "افتح لوحة نسك الحج · اضغط مطولاً للانتقال المباشر" : "Open Hajj Nusuk panel · long-press to open full platform"}
          className="group inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/60 bg-gradient-to-r from-[#00D4FF]/25 via-[#3AE8FF]/15 to-[#00D4FF]/25 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(58,232,255,0.65)] transition hover:border-[#3AE8FF] hover:shadow-[0_0_36px_-4px_rgba(58,232,255,0.9)]"
        >
          <Moon className="h-4 w-4 text-[#3AE8FF] drop-shadow-[0_0_8px_rgba(58,232,255,0.9)]" aria-hidden />
          <span>{ar ? "منصة نسك الحج · 1447 هـ" : "Hajj Nusuk Platform · 1447 AH"}</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#3AE8FF] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => { try { window.dispatchEvent(new CustomEvent("aria:open")); } catch { /* noop */ } }}
          aria-label={ar ? "تواصل معنا عبر آريا" : "Contact us via ARIA"}
          className="group inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/45 bg-[#3AE8FF]/10 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(58,232,255,0.5)] transition hover:border-[#3AE8FF]/80 hover:bg-[#3AE8FF]/20"
        >
          <Sparkles className="h-4 w-4 text-[#3AE8FF]" aria-hidden />
          <span>{ar ? "تواصل معنا · تحدّث مع آريا" : "Contact us · Talk to ARIA"}</span>
        </button>
      </div>



      <div className="hes-anim grid grid-cols-1 gap-5">
        {/* Digital integration constellation */}
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#00D4FF]/30 bg-gradient-to-bl from-[#04243c] via-[#02101e] to-[#061A2E] shadow-[0_0_60px_-25px_rgba(0,212,255,0.5)]"
          aria-label={ar ? "حلقة التكامل الرقمي" : "Digital integration ring"}
        >
          {/* Soft glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 55%, rgba(58,232,255,0.18) 0%, transparent 60%)",
            }}
          />

          {/* Energy flow network */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id="hes-hub" cx="50%" cy="55%" r="35%">
                <stop offset="0%" stopColor="rgba(58,232,255,0.5)" />
                <stop offset="100%" stopColor="rgba(0,212,255,0)" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="55" r="30" fill="url(#hes-hub)" />
            {[
              { x: 18, y: 25 },
              { x: 82, y: 25 },
              { x: 50, y: 88 },
            ].map((p, i) => (
              <line
                key={i}
                x1="50"
                y1="55"
                x2={p.x}
                y2={p.y}
                stroke="#3AE8FF"
                strokeWidth="0.5"
                strokeDasharray="2 2.5"
                opacity="0.85"
                style={{ animation: `hes-flow ${4 + i * 0.6}s linear infinite` }}
              />
            ))}
          </svg>

          {/* Integration nodes */}
          {INTEGRATIONS.map((it, i) => {
            const pos = [
              { left: "18%", top: "25%" },
              { left: "82%", top: "25%" },
              { left: "50%", top: "88%" },
            ][i];
            const Icon = it.icon;
            return (
              <div
                key={it.label_en}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                style={pos as React.CSSProperties}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3AE8FF]/55 bg-[#02101e]/85 backdrop-blur-md sm:h-14 sm:w-14"
                  style={{
                    boxShadow: `0 0 24px ${it.hue}55, inset 0 0 12px ${it.hue}25`,
                    animation: `hes-pulse ${3.4 + i * 0.4}s ease-in-out ${i * 0.5}s infinite`,
                  }}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: it.hue }} />
                </span>
                <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/85 sm:text-[10px]">
                  {ar ? it.label_ar : it.label_en}
                </span>

              </div>
            );
          })}

          {/* Central executive hub */}
          <div
            className="absolute left-1/2 top-[55%] flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#00D4FF]/40 via-[#0a2a44] to-[#061A2E] sm:h-24 sm:w-24"
            style={{ boxShadow: "0 0 50px rgba(58,232,255,0.55), inset 0 0 25px rgba(0,212,255,0.35)" }}
          >
            <div className="text-center">
              <Sparkles className="mx-auto h-5 w-5 text-[#3AE8FF] drop-shadow-[0_0_8px_rgba(58,232,255,0.9)]" />
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.3em] text-white/90">Nexus</div>
            </div>
          </div>

          {/* Footer caption */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-[#02101e] via-[#02101e]/80 to-transparent p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-white/65">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span>{ar ? "متوافق مع نظام حماية البيانات الشخصية (PDPL)" : "PDPL-aligned data protection"}</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3AE8FF]/80">
              Digital Integration
            </span>
          </div>
        </div>
      </div>

      {/* Integration ribbon — planned integrations (roadmap) */}
      <div className="mt-5 rounded-2xl border border-[#00D4FF]/25 bg-[#061A2E]/60 p-3 backdrop-blur-md sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3AE8FF]/80">
            {ar ? "تكاملات مخطّطة" : "Planned Integrations"}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--nx-warning)]/40 bg-[color:var(--nx-warning)]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[color:var(--nx-warning)]">
            Roadmap
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {INTEGRATIONS.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label_en} className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#02101e]"
                style={{ boxShadow: `0 0 18px ${it.hue}33` }}
              >
                <Icon className="h-4 w-4" style={{ color: it.hue }} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-white sm:text-sm">{ar ? it.label_ar : it.label_en}</div>
                <div className="truncate text-[10px] uppercase tracking-[0.18em] text-white/45">{ar ? it.label_en : it.label_ar}</div>
              </div>

            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}
