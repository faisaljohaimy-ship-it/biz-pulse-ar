// Executive Bridge — bilingual, board-room-grade seven-scene showcase.
// Arabic-first RTL, English simultaneous secondary; toggle switches which
// is primary/larger without hiding the other. No autoplay narration:
// per-scene "استمع | Listen" control invokes /api/public/aria-tts.
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { SimulationRibbon } from "@/components/SimulationRibbon";

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
          "تجربة تنفيذية ثنائية اللغة — سبعة مشاهد سينمائية تعرض منصة نيكسيوس. Bilingual seven-scene executive showcase of the NEXIOS platform.",
      },
      { property: "og:title", content: "جسر القيادة التنفيذي — Executive Command Bridge" },
      {
        property: "og:description",
        content: "Board-room-grade bilingual showcase of NEXIOS — Arabic-first, English secondary.",
      },
    ],
  }),
  component: ExecutiveBridgePage,
});

/* ─────────── Scene content (both languages, always) ─────────── */

type Accent = "navy" | "emerald" | "gold";

interface Scene {
  id: string;
  kicker_ar: string;
  kicker_en: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  accent: Accent;
  render?: () => React.ReactNode;
  showSimRibbon?: boolean;
}

const SCENES: Scene[] = [
  {
    id: "opening",
    kicker_ar: "الافتتاح",
    kicker_en: "Opening",
    title_ar: "الذكاء، تحت القيادة.",
    title_en: "Intelligence, under command.",
    body_ar: "منصّة إنجاز الأعمال التنفيذية — قرارٌ موحّد، من الرؤية إلى التنفيذ.",
    body_en: "Executive Delivery Platform — one unified decision, from strategy to execution.",
    accent: "navy",
  },
  {
    id: "challenge",
    kicker_ar: "التحدي",
    kicker_en: "The Challenge",
    title_ar: "التجزئة تُبطئ القرار.",
    title_en: "Fragmentation slows the decision.",
    body_ar:
      "أنظمة منفصلة، بيانات متناثرة، تقارير متأخّرة — القيادة تقرأ الماضي بدلاً من قيادة الحاضر.",
    body_en:
      "Disconnected systems and scattered data force leadership to read the past instead of steering the present.",
    accent: "gold",
    render: () => <ChallengeVisual />,
  },
  {
    id: "solution",
    kicker_ar: "الحل",
    kicker_en: "The Solution",
    title_ar: "بنية نيكسيوس الموحّدة.",
    title_en: "The NEXIOS unified architecture.",
    body_ar: "مركز قيادة واحد + وكلاء تنفيذ + توأم رقمي حي + ذكاء آريا — كلها في طبقة واحدة.",
    body_en: "Command center + execution agents + live digital twin + ARIA — one composed layer.",
    accent: "emerald",
    render: () => <SolutionDiagram />,
  },
  {
    id: "aria",
    kicker_ar: "آريا الحية",
    kicker_en: "ARIA Live",
    title_ar: "آريا — العقل التنفيذي.",
    title_en: "ARIA — the executive mind.",
    body_ar: "تفهم، وتحلّل، وتقترح — والاعتماد يبقى بشريًا.",
    body_en: "It understands, analyzes and proposes — humans approve.",
    accent: "emerald",
    render: () => <AriaOrb />,
  },
  {
    id: "proof",
    kicker_ar: "الإثبات",
    kicker_en: "The Proof",
    title_ar: "من العرض إلى الميدان.",
    title_en: "From showcase to the field.",
    body_ar: "بيئة محاكاة مرجعية — مواقع، حوادث، أوامر عمل — بعلامة أصالة واضحة.",
    body_en: "A reference simulation — sites, incidents, work orders — with an honest simulation tag.",
    accent: "navy",
    render: () => <ProofPanel />,
    showSimRibbon: true,
  },
  {
    id: "compliance",
    kicker_ar: "الامتثال والأمان",
    kicker_en: "Compliance & Security",
    title_ar: "الثقة مبنية بالتصميم.",
    title_en: "Trust, engineered by design.",
    body_ar: "التزام بنظام حماية البيانات الشخصية، عزل مستأجرين كامل، وسجل تدقيق لكل قرار.",
    body_en: "PDPL alignment, full tenant isolation via RLS, and an audit trail behind every decision.",
    accent: "emerald",
    render: () => <TrustBadges />,
  },
  {
    id: "cta",
    kicker_ar: "الدعوة للعمل",
    kicker_en: "Call to Action",
    title_ar: "ابدأ رحلة القيادة الذكية.",
    title_en: "Begin the intelligent-leadership journey.",
    body_ar: "برنامج تجريبي مركّز — نطاق واضح، جدولة ٩٠ يومًا، وفريق تفعيل مخصّص.",
    body_en: "A focused pilot — clear scope, a 90-day timeline, and a dedicated activation team.",
    accent: "gold",
    render: () => <ClosingCTA />,
  },
];

const AUTO_ADVANCE_MS = 14000;

/* ─────────── Page ─────────── */

function ExecutiveBridgePage() {
  const search = useSearch({ from: "/executive-bridge" });
  const navigate = useNavigate({ from: "/executive-bridge" });
  const initial = Math.min(Math.max(search.p ?? 0, 0), SCENES.length - 1);
  const [idx, setIdx] = React.useState(initial);
  const [primary, setPrimary] = React.useState<"ar" | "en">(search.lang ?? "ar");
  // Continuous narration mode: ARIA reads each scene, then auto-advances
  // on audio-ended. Falls back to a silent timer if audio is unavailable.
  const [narrating, setNarrating] = React.useState(true);
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

  // Continuous narration: fetch this scene's TTS, play, then advance.
  React.useEffect(() => {
    if (!narrating) {
      narrationAudioRef.current?.pause();
      narrationAudioRef.current = null;
      setProgress(0);
      return;
    }
    let cancelled = false;
    let fallbackTimer: number | null = null;
    let raf = 0;
    const scene = SCENES[idx];
    const text =
      primary === "ar"
        ? `${scene.title_ar} ${scene.body_ar}`
        : `${scene.title_en}. ${scene.body_en}`;

    const advance = () => {
      if (cancelled) return;
      if (idx < SCENES.length - 1) setIdx(idx + 1);
      else setNarrating(false);
    };

    const startVisualProgress = (durationMs: number) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - t0) / durationMs);
        setProgress(p);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        AriaAudioBus.unlock();
        AriaAudioBus.stopAll();
      } catch {
        /* noop */
      }
      try {
        const r = await fetch("/api/public/aria-tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!r.ok || cancelled) throw new Error(`tts ${r.status}`);
        const blob = await r.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        a.preload = "auto";
        narrationAudioRef.current = a;
        a.onloadedmetadata = () => {
          if (!cancelled && isFinite(a.duration) && a.duration > 0) {
            startVisualProgress(a.duration * 1000);
          }
        };
        a.onended = () => {
          URL.revokeObjectURL(url);
          advance();
        };
        a.onerror = () => {
          URL.revokeObjectURL(url);
          fallbackTimer = window.setTimeout(advance, AUTO_ADVANCE_MS);
          startVisualProgress(AUTO_ADVANCE_MS);
        };
        try {
          await a.play();
        } catch {
          // Autoplay blocked — surface pause state so the user can resume.
          if (!cancelled) setNarrating(false);
        }
      } catch {
        // TTS unavailable — advance on the fallback timer to keep the tour moving.
        fallbackTimer = window.setTimeout(advance, AUTO_ADVANCE_MS);
        startVisualProgress(AUTO_ADVANCE_MS);
      }
    })();

    return () => {
      cancelled = true;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      cancelAnimationFrame(raf);
      narrationAudioRef.current?.pause();
      narrationAudioRef.current = null;
    };
  }, [narrating, idx, primary]);


  const goTo = React.useCallback((next: number) => {
    setIdx(((next % SCENES.length) + SCENES.length) % SCENES.length);
    setProgress(0);
  }, []);

  // Keyboard
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(idx - 1); // RTL: → goes back
      else if (e.key === "ArrowLeft") goTo(idx + 1);
      else if (e.key === " ") {
        e.preventDefault();
        setNarrating((a: boolean) => !a);
      } else if (e.key.toLowerCase() === "l") {
        setPrimary((p) => (p === "ar" ? "en" : "ar"));
      } else if (e.key === "Escape") {
        try {
          AriaAudioBus.stopAll();
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, goTo]);

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
      try {
        AriaAudioBus.stopAll();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") stop();
    });
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, []);

  const scene = SCENES[idx];
  const isPrimaryAr = primary === "ar";
  const overallProgress = ((idx + progress) / SCENES.length) * 100;

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
      {scene.showSimRibbon && <SimulationRibbon />}

      <SkylineBackground reduced={reduced} accent={scene.accent} />
      <Scrim />

      {/* Top bar */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-4 pt-3 sm:px-8 sm:pt-5"
        style={{ marginTop: scene.showSimRibbon ? 32 : 0 }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/75">
            <span className="h-2 w-2 rounded-full bg-[#F5C560] shadow-[0_0_12px_#F5C560]" />
            نيكسيوس · NEXIOS
          </div>
          <DateStamp />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <LanguageToggle primary={primary} onChange={setPrimary} />
          <span className="hidden text-[11px] font-mono text-white/60 sm:inline">
            {String(idx + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="pointer-events-none absolute inset-x-0 top-[68px] z-30 h-[2px] bg-white/10 sm:top-[76px]">
        <div
          className="h-full bg-gradient-to-l from-[#F5C560] via-[#3AE8FF] to-[#00D4FF]"
          style={{
            width: `${overallProgress}%`,
            transition: reduced ? "none" : "width 180ms linear",
          }}
        />
      </div>

      {/* Scenes */}
      <div className="relative z-20 flex h-full w-full items-center justify-center px-4 sm:px-10">
        {SCENES.map((s, i) => (
          <SceneLayer
            key={s.id}
            active={i === idx}
            reduced={reduced}
            scene={s}
            primary={isPrimaryAr ? "ar" : "en"}
          />
        ))}
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 pb-5 sm:pb-8">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <ControlBtn onClick={() => goTo(idx - 1)} label="السابق | Previous">
            ›
          </ControlBtn>
          <ControlBtn
            onClick={() => setAutoAdvance((a) => !a)}
            label={autoAdvance ? "إيقاف التقديم | Pause auto" : "تقديم تلقائي | Auto-advance"}
          >
            {autoAdvance ? "❚❚" : "▶"}
          </ControlBtn>
          <ControlBtn onClick={() => goTo(idx + 1)} label="التالي | Next">
            ‹
          </ControlBtn>
          <a
            href="/"
            className="mr-1 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur transition hover:border-[#F5C560]/70 hover:text-white sm:px-4 sm:text-[11px]"
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
}: {
  active: boolean;
  reduced: boolean;
  scene: Scene;
  primary: "ar" | "en";
}) {
  const accentColor =
    scene.accent === "gold" ? "#F5C560" : scene.accent === "emerald" ? "#2FBF8F" : "#3AE8FF";

  const arBig = primary === "ar";

  return (
    <div
      aria-hidden={!active}
      className="absolute inset-0 flex items-center justify-center px-4 sm:px-10"
      style={{
        opacity: active ? 1 : 0,
        transform: reduced ? "none" : active ? "translateY(0)" : "translateY(8px)",
        transition: reduced ? "opacity 0ms" : "opacity 600ms ease, transform 600ms ease",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <div className="mx-auto w-full max-w-3xl text-center">
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em]"
          style={{
            borderColor: `${accentColor}66`,
            color: accentColor,
            background: `${accentColor}14`,
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
              className="mx-auto max-w-2xl text-[28px] font-black leading-[1.2] tracking-tight text-white sm:text-[46px] sm:leading-[1.12]"
              style={{
                fontFamily:
                  "'IBM Plex Sans Arabic','Tajawal',ui-sans-serif,system-ui",
                textShadow: "0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              {scene.title_ar}
            </h1>
            <h2
              dir="ltr"
              lang="en"
              className="mx-auto mt-2 max-w-2xl text-[14px] font-semibold leading-snug text-white/80 sm:text-[18px]"
              style={{ fontFamily: "'Space Grotesk',ui-sans-serif,system-ui" }}
            >
              {scene.title_en}
            </h2>
            <p
              dir="rtl"
              lang="ar"
              className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.9] text-white/90 sm:text-[17px]"
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
              className="mx-auto mt-2 max-w-xl text-[12px] leading-[1.7] text-white/65 sm:text-[13.5px]"
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
              className="mx-auto max-w-2xl text-[26px] font-black leading-[1.15] tracking-tight text-white sm:text-[44px]"
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
              className="mx-auto mt-2 max-w-2xl text-[15px] font-semibold leading-snug text-white/80 sm:text-[19px]"
              style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',ui-sans-serif,system-ui" }}
            >
              {scene.title_ar}
            </h2>
            <p
              dir="ltr"
              lang="en"
              className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.75] text-white/90 sm:text-[17px]"
              style={{ fontFamily: "'Space Grotesk',ui-sans-serif,system-ui" }}
            >
              {scene.body_en}
            </p>
            <p
              dir="rtl"
              lang="ar"
              className="mx-auto mt-2 max-w-xl text-[13px] leading-[1.85] text-white/65 sm:text-[14.5px]"
              style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',ui-sans-serif,system-ui" }}
            >
              {scene.body_ar}
            </p>
          </>
        )}

        {scene.render && <div className="mt-7">{scene.render()}</div>}

        <div className="mt-6 flex items-center justify-center">
          <ListenButton
            text={primary === "ar" ? scene.body_ar : scene.body_en}
            sceneId={scene.id}
            lang={primary}
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
          primary === "ar"
            ? "bg-[#F5C560] text-[#03111f]"
            : "text-white/75 hover:text-white"
        }`}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        aria-pressed={primary === "en"}
        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
          primary === "en"
            ? "bg-[#F5C560] text-[#03111f]"
            : "text-white/75 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}

/* ─────────── Per-scene "Listen" (no autoplay) ─────────── */

function ListenButton({
  text,
  sceneId,
  lang,
}: {
  text: string;
  sceneId: string;
  lang: "ar" | "en";
}) {
  const [state, setState] = React.useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [sceneId]);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setState("idle");
  };

  const play = async () => {
    if (state === "playing") return stop();
    try {
      setState("loading");
      try {
        AriaAudioBus.unlock();
        AriaAudioBus.stopAll();
      } catch {
        /* noop */
      }
      const r = await fetch("/api/public/aria-tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(`tts ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };
      a.onerror = () => setState("error");
      await a.play();
      setState("playing");
    } catch {
      setState("error");
    }
  };

  const label =
    state === "loading"
      ? lang === "ar"
        ? "جارٍ التحضير…"
        : "Preparing…"
      : state === "playing"
      ? lang === "ar"
        ? "إيقاف"
        : "Stop"
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
      onClick={play}
      disabled={state === "loading"}
      className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/40 bg-black/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#3AE8FF] backdrop-blur transition hover:border-[#3AE8FF] hover:text-white disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${
          state === "playing"
            ? "animate-pulse bg-[#3AE8FF] shadow-[0_0_10px_#3AE8FF]"
            : "bg-[#3AE8FF]/70"
        }`}
      />
      {label}
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

/* ─────────── Scene visuals ─────────── */

function ChallengeVisual() {
  const dots = ["ERP", "HR", "CRM", "SCADA", "GIS", "Ops"];
  return (
    <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2">
      {dots.map((d) => (
        <span
          key={d}
          className="rounded-lg border border-[#F5C560]/30 bg-[#F5C560]/[0.06] px-3 py-1.5 text-[11px] font-mono text-[#F5C560]/85"
        >
          {d}
        </span>
      ))}
      <span className="mt-2 w-full text-[11px] text-white/55">
        صوامع بيانات · Data silos
      </span>
    </div>
  );
}

function SolutionDiagram() {
  const nodes = [
    { ar: "القيادة", en: "Command" },
    { ar: "الوكلاء", en: "Agents" },
    { ar: "التوأم", en: "Twin" },
    { ar: "آريا", en: "ARIA" },
  ];
  return (
    <div className="mx-auto grid max-w-lg grid-cols-4 gap-2">
      {nodes.map((n, i) => (
        <div
          key={n.en}
          className="flex flex-col items-center gap-1 rounded-xl border border-[#2FBF8F]/35 bg-[#2FBF8F]/[0.07] px-2 py-3 backdrop-blur"
          style={{ animation: `sceneFadeUp 500ms ease ${i * 80}ms both` }}
        >
          <span className="text-[13px] font-black text-white">{n.ar}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2FBF8F]">
            {n.en}
          </span>
        </div>
      ))}
      <style>{`@keyframes sceneFadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function AriaOrb() {
  return (
    <div className="relative mx-auto h-40 w-40 sm:h-52 sm:w-52">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#3AE8FF_0%,#0B2F55_45%,#03111f_75%)] shadow-[0_0_60px_rgba(58,232,255,0.45)]" />
      <div className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-[#3AE8FF]/40" />
      <div className="absolute -inset-3 animate-[spin_28s_linear_infinite_reverse] rounded-full border border-[#F5C560]/25" />
      <div className="absolute inset-0 flex items-center justify-center text-[22px] font-black text-white/95">
        آريا · ARIA
      </div>
    </div>
  );
}

function ProofPanel() {
  const rows = [
    { ar: "مواقع مُدارة", en: "Managed sites", v: "12" },
    { ar: "حوادث نشِطة", en: "Active incidents", v: "3" },
    { ar: "أوامر عمل", en: "Work orders", v: "47" },
  ];
  return (
    <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
      {rows.map((r) => (
        <div
          key={r.en}
          className="rounded-2xl border border-white/15 bg-black/40 p-3 backdrop-blur"
        >
          <div
            className="text-[24px] font-black text-white sm:text-[30px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {r.v}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-white/85">{r.ar}</div>
          <div className="text-[9.5px] font-semibold uppercase tracking-wider text-white/50">
            {r.en}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrustBadges() {
  const badges = [
    { ar: "التزام PDPL", en: "PDPL aligned" },
    { ar: "عزل المستأجرين RLS", en: "Tenant RLS" },
    { ar: "سجل تدقيق كامل", en: "Full audit trail" },
    { ar: "حَوكمة القرار", en: "Decision governance" },
  ];
  return (
    <div className="mx-auto grid max-w-lg grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {badges.map((b) => (
        <div
          key={b.en}
          className="rounded-xl border border-[#2FBF8F]/35 bg-[#2FBF8F]/[0.06] px-3 py-3 text-center"
        >
          <div className="text-[12px] font-bold text-white">{b.ar}</div>
          <div className="text-[9.5px] font-semibold uppercase tracking-wider text-[#2FBF8F]">
            {b.en}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClosingCTA() {
  return (
    <div className="flex flex-col items-center gap-3">
      <a
        href="/book"
        className="rounded-full bg-[#F5C560] px-8 py-4 text-[13px] font-black uppercase tracking-[0.24em] text-[#03111f] shadow-[0_10px_40px_rgba(245,197,96,0.45)] transition hover:scale-[1.03]"
      >
        احجز عرضًا تنفيذيًا · Book an executive session
      </a>
      <a
        href="/contact"
        className="text-[12px] font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline"
      >
        تواصل مع فريق التفعيل · Contact the activation team
      </a>
    </div>
  );
}

/* ─────────── Background layers (reused from prior implementation) ─────────── */

function SkylineBackground({ reduced, accent }: { reduced: boolean; accent: Accent }) {
  const skyTop =
    accent === "gold" ? "#1a1305" : accent === "emerald" ? "#031a17" : "#03111f";
  const skyMid =
    accent === "gold" ? "#3a2609" : accent === "emerald" ? "#0a3a2f" : "#0a2648";
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
        className="absolute -top-[10%] left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            accent === "gold"
              ? "radial-gradient(closest-side, rgba(245,197,96,0.55), transparent 70%)"
              : accent === "emerald"
              ? "radial-gradient(closest-side, rgba(47,191,143,0.45), transparent 70%)"
              : "radial-gradient(closest-side, rgba(58,232,255,0.4), transparent 70%)",
          transition: reduced ? "none" : "background 900ms ease",
        }}
      />
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-lg text-white backdrop-blur transition hover:border-[#F5C560]/70 hover:bg-black/70"
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
