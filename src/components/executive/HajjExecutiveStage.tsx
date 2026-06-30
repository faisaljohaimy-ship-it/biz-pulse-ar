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
import { Link } from "@tanstack/react-router";
import { Moon, Gem, ArrowLeft, ArrowRight, Mail, Database, Monitor, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";


const INTEGRATIONS = [
  { icon: Mail,     label_ar: "Outlook",      label_en: "Microsoft Outlook", hue: "#22c1ff" },
  { icon: Database, label_ar: "SAP",          label_en: "SAP S/4HANA",       hue: "#3AE8FF" },
  { icon: Monitor,  label_ar: "Windows 365",  label_en: "Windows 365",       hue: "#7dd3fc" },
] as const;

export function HajjExecutiveStage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;
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


      <div className="hes-anim grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {/* RIGHT (primary in RTL) — Hajj cinematic gateway */}
        <Link
          to="/hajj-prime"
          aria-label={ar ? "افتح منصة الحج التنفيذية" : "Open the Hajj Executive Platform"}
          className="group relative block aspect-[4/3] overflow-hidden rounded-3xl border border-[#00D4FF]/35 bg-gradient-to-br from-[#02101e] via-[#04243c] to-[#061A2E] shadow-[0_0_60px_-20px_rgba(0,212,255,0.55)] transition hover:border-[#3AE8FF]/70 hover:shadow-[0_0_80px_-15px_rgba(58,232,255,0.75)]"
        >

          {/* Volumetric backdrop — orbiting energy disc */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 40%, rgba(58,232,255,0.22) 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(0,212,255,0.18) 0%, transparent 60%)",
            }}
          />
          {/* Sacred geometry rings */}
          {[60, 75, 90].map((sz, i) => (
            <span
              key={sz}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-[#3AE8FF]/15"
              style={{
                width: `${sz}%`,
                height: `${sz}%`,
                transform: "translate(-50%,-50%)",
                animation: `hes-pulse ${5 + i}s ease-in-out ${i * 0.7}s infinite`,
              }}
            />
          ))}

          {/* Vision 2030 GEM — central rotating diamond */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 sm:h-36 sm:w-36"
            style={{ transform: "translate(-50%,-50%)", animation: "hes-gem-glow 4.2s ease-in-out infinite" }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <defs>
                <linearGradient id="hes-gem-grad" x1="0" x2="100" y1="0" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3AE8FF" />
                  <stop offset="55%" stopColor="#00D4FF" />
                  <stop offset="100%" stopColor="#0a4a7a" />
                </linearGradient>
                <linearGradient id="hes-gem-face" x1="0" x2="0" y1="0" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
                  <stop offset="100%" stopColor="rgba(58,232,255,0.05)" />
                </linearGradient>
              </defs>
              <g style={{ transformOrigin: "50px 50px", animation: "hes-orbit 22s linear infinite" }}>
                <polygon points="50,8 86,40 70,86 30,86 14,40" fill="url(#hes-gem-grad)" stroke="#3AE8FF" strokeWidth="1.2" />
                <polygon points="50,8 86,40 50,50 14,40" fill="url(#hes-gem-face)" opacity="0.55" />
                <polygon points="50,50 86,40 70,86" fill="rgba(0,212,255,0.18)" />
                <polygon points="50,50 14,40 30,86" fill="rgba(58,232,255,0.12)" />
                <polygon points="50,50 70,86 30,86" fill="rgba(255,255,255,0.06)" />
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <Gem className="h-5 w-5 text-white/95 drop-shadow-[0_0_6px_rgba(58,232,255,0.9)]" />
              <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.28em] text-white/90">Vision 2030</div>
            </div>
          </div>

          {/* Title + crescent */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
              LIVE · {ar ? "مشاعر 1447" : "Mashaer 1447"}
            </span>
            <Moon className="h-6 w-6 text-[#3AE8FF] drop-shadow-[0_0_10px_rgba(58,232,255,0.8)]" />
          </div>

          {/* Bottom CTA */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#02101e] via-[#02101e]/85 to-transparent p-5">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#3AE8FF]/80">Hajj Operations</div>
              <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">
                {ar ? "نظام الحج التنفيذي" : "Hajj Executive Module"}
              </h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/65 sm:text-xs">
                {ar
                  ? "إدارة المشاعر، المخيمات، الحشود، والاستجابة الطارئة — مدعومة برؤية المملكة 2030."
                  : "Mashaer, camps, crowd-flow, and emergency response — backed by Saudi Vision 2030."}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#3AE8FF]/60 bg-[#3AE8FF]/15 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_0_24px_rgba(58,232,255,0.35)] transition group-hover:bg-[#3AE8FF]/25">
              <span>{ar ? "دخول" : "Enter"}</span>
              <Arrow className="h-3.5 w-3.5" />
            </span>
          </div>

        </Link>

        {/* LEFT — Digital integration constellation */}
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#00D4FF]/30 bg-gradient-to-bl from-[#04243c] via-[#02101e] to-[#061A2E] shadow-[0_0_60px_-25px_rgba(0,212,255,0.5)]"
          aria-label="حلقة التكامل الرقمي"
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
                  {it.label_ar}
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
              <span>Enterprise · ISO 27001 · SOC 2</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3AE8FF]/80">
              Digital Integration
            </span>
          </div>
        </div>
      </div>

      {/* Integration ribbon */}
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[#00D4FF]/25 bg-[#061A2E]/60 p-3 backdrop-blur-md sm:gap-4 sm:p-4">
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
                <div className="truncate text-xs font-semibold text-white sm:text-sm">{it.label_ar}</div>
                <div className="truncate text-[10px] uppercase tracking-[0.18em] text-white/45">{it.label_en}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
