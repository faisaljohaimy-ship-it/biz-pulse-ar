import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ScenePlayer, type Scene } from "@/components/promo/ScenePlayer";
import { KenBurnsImage } from "@/components/promo/KenBurnsImage";
import { KSA_IMAGES, preloadKsaImages } from "@/components/promo/ksaImagery";
import { HologramOverlay } from "@/components/promo/HologramOverlay";

export const Route = createFileRoute("/promo/impact")({
  head: () => ({
    meta: [
      { title: "نيكسوس — من الفوضى إلى الذكاء" },
      {
        name: "description",
        content: "فيلم تنفيذي 60 ثانية: كيف يوحّد نيكسوس أنظمتك ويسرّع قراراتك.",
      },
      { property: "og:title", content: "نيكسوس — من الفوضى إلى الذكاء" },
      { property: "og:description", content: "فيلم تنفيذي 60 ثانية." },
    ],
  }),
  component: PromoImpact,
});

const DURATION = 60;

// Arabic-Indic numerals
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;
const toArDigits = (n: number | string) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/* ---------- shared primitives ---------- */

function FadeRise({
  show,
  delay = 0,
  className = "",
  children,
}: {
  show: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 600ms ${delay}ms cubic-bezier(0.16,1,0.3,1), transform 600ms ${delay}ms cubic-bezier(0.16,1,0.3,1)`,
      }}
    >
      {children}
    </div>
  );
}

function Counter({
  target,
  progress,
  suffix = "٪",
  prefix = "",
}: {
  target: number;
  progress: number;
  suffix?: string;
  prefix?: string;
}) {
  const eased = easeOutCubic(Math.min(1, Math.max(0, progress)));
  const value = Math.round(target * eased);
  return (
    <span className="tabular-nums">
      {prefix}
      {toArDigits(value)}
      {suffix}
    </span>
  );
}

/* ---------- scenes ---------- */

// SCENE 1 — الصدمة
function Scene1(p: number) {
  const t = p * 8;
  const show1 = t > 0.4;
  const show2 = t > 3.0;
  const show3 = t > 5.5;
  const flashA = t > 2.7 && t < 3.0;
  const flashB = t > 5.2 && t < 5.5;
  return (
    <>
      <KenBurnsImage src={KSA_IMAGES.kingdomTower} progress={p} opacity={0.25} />
      <Particles color="#10B981" />
      {(flashA || flashB) && <div className="absolute inset-0 bg-red-600/25 mix-blend-screen" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <FadeRise show={show1}>
          <p
            className="font-bold leading-tight text-white"
            style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}
          >
            «أنظمتك كثيرة… وإنجازك قليل.»
          </p>
        </FadeRise>
        <FadeRise show={show2}>
          <p
            className="font-bold leading-tight text-white/95"
            style={{ fontSize: "clamp(1.75rem, 5vw, 4.5rem)" }}
          >
            «قراراتك تنتظر… ومنافسوك لا ينتظرون.»
          </p>
        </FadeRise>
        <FadeRise show={show3}>
          <p
            className="font-bold leading-tight text-red-300"
            style={{ fontSize: "clamp(1.75rem, 5vw, 4.5rem)" }}
          >
            «هذه ليست صدفة — هذه فوضى تشغيلية.»
          </p>
        </FadeRise>
      </div>
    </>
  );
}

// SCENE 2 — التشتت → التوحيد
function Scene2(p: number) {
  const converge = easeOutCubic(Math.min(1, p * 1.4));
  const nodes = Array.from({ length: 10 });
  return (
    <>
      <KenBurnsImage src={KSA_IMAGES.faisaliah} progress={p} opacity={0.15} direction={-1} />
      <div className="absolute inset-0">
        {nodes.map((_, i) => {
          const angle = (i / nodes.length) * Math.PI * 2;
          const r = 42 * (1 - converge);
          const x = 50 + Math.cos(angle) * r;
          const y = 50 + Math.sin(angle) * r;
          return (
            <div
              key={i}
              className="absolute h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_6px_rgba(16,185,129,0.6)]"
              style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
            />
          );
        })}
        <div
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/30 blur-2xl"
          style={{ opacity: converge, transform: `translate(-50%,-50%) scale(${0.5 + converge})` }}
        />
      </div>
      <div className="absolute inset-x-0 bottom-[10%] flex flex-col items-center gap-6 px-6 text-center">
        <FadeRise show={p > 0.05}>
          <p className="text-white/80" style={{ fontSize: "clamp(1.25rem, 3.5vw, 2.5rem)" }}>
            «بياناتك مبعثرة في عشرة أنظمة.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.4}>
          <p
            className="font-bold text-emerald-300"
            style={{ fontSize: "clamp(1.5rem, 4.5vw, 3.5rem)" }}
          >
            «نيكسوس يوحّدها في مكانٍ واحد.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.65}>
          <p className="font-black text-white" style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}>
            وقت الوصول للمعلومة ينخفض حتى −<Counter target={40} progress={(p - 0.5) / 0.5} />
          </p>
        </FadeRise>
      </div>
    </>
  );
}

// SCENE 3 — اليدوي → الأتمتة
function Scene3(p: number) {
  const pulse = (p * 4) % 1;
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex w-[90%] max-w-4xl flex-row-reverse items-center justify-between gap-3">
          {[0, 1, 2, 3].map((i) => {
            const active = pulse > i / 4 && pulse < (i + 1) / 4;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`h-14 w-14 rounded-full border-2 transition-all duration-300 sm:h-20 sm:w-20 ${
                    active
                      ? "border-emerald-300 bg-emerald-400/40 shadow-[0_0_30px_10px_rgba(16,185,129,0.6)]"
                      : "border-emerald-500/40 bg-emerald-500/10"
                  }`}
                />
                {i < 3 && <div className="hidden h-[2px] w-full bg-emerald-500/30 sm:block" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[10%] flex flex-col items-center gap-6 px-6 text-center">
        <FadeRise show={p > 0.05}>
          <p className="text-white/80" style={{ fontSize: "clamp(1.25rem, 3.5vw, 2.5rem)" }}>
            «موظفوك يكررون مهامَ يدويةً كل يوم.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.35}>
          <p
            className="font-bold text-emerald-300"
            style={{ fontSize: "clamp(1.5rem, 4.5vw, 3.5rem)" }}
          >
            «الأتمتة الذكية تتولاها عنك.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.6}>
          <p className="font-black text-white" style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}>
            حتى −<Counter target={60} progress={(p - 0.45) / 0.55} /> من الجهد اليدوي يختفي
          </p>
        </FadeRise>
      </div>
    </>
  );
}

// SCENE 4 — البطء → القرار اللحظي
function Scene4(p: number) {
  const draw = Math.min(1, p * 1.5);
  return (
    <>
      <KenBurnsImage src={KSA_IMAGES.kafd} progress={p} opacity={0.2} direction={-1} />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="grid w-full max-w-4xl grid-cols-2 gap-4 sm:gap-6" style={{ opacity: draw }}>
          <div className="rounded-xl border border-emerald-400/30 bg-black/50 p-4 backdrop-blur">
            <div className="text-xs text-emerald-300/80">الإيرادات</div>
            <div className="mt-1 text-2xl font-black text-white sm:text-4xl">
              <Counter target={128} progress={draw} suffix="م" />
            </div>
          </div>
          <div className="rounded-xl border border-cyan-400/30 bg-black/50 p-4 backdrop-blur">
            <div className="text-xs text-cyan-300/80">الكفاءة</div>
            <div className="mt-1 text-2xl font-black text-white sm:text-4xl">
              <Counter target={94} progress={draw} suffix="٪" />
            </div>
          </div>
          <div className="col-span-2 rounded-xl border border-emerald-400/20 bg-black/50 p-4 backdrop-blur">
            <svg viewBox="0 0 300 80" className="h-20 w-full">
              <path
                d="M0,60 L50,50 L100,55 L150,35 L200,40 L250,20 L300,15"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeDasharray="500"
                strokeDashoffset={500 - draw * 500}
              />
            </svg>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[8%] flex flex-col items-center gap-4 px-6 text-center">
        <FadeRise show={p > 0.05}>
          <p className="text-white/80" style={{ fontSize: "clamp(1.25rem, 3.5vw, 2.5rem)" }}>
            «قراراتك تنتظر تقاريرَ الأسبوع القادم.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.4}>
          <p
            className="font-bold text-emerald-300"
            style={{ fontSize: "clamp(1.5rem, 4.5vw, 3.5rem)" }}
          >
            «لوحات القيادة اللحظية تجيبك الآن.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.65}>
          <p
            className="font-black text-white"
            style={{ fontSize: "clamp(1.75rem, 5.5vw, 4.5rem)" }}
          >
            سرعة القرار ×<Counter target={3} progress={(p - 0.5) / 0.5} suffix="" />
          </p>
        </FadeRise>
      </div>
    </>
  );
}

// SCENE 5 — الأخطاء → التنبؤ (gold accent)
function Scene5(p: number) {
  const detected = p > 0.15;
  const neutralized = p > 0.5;
  return (
    <>
      <KenBurnsImage src={KSA_IMAGES.energyGrid} progress={p} opacity={0.2} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-56 w-56 sm:h-72 sm:w-72">
          {detected && (
            <div
              className="absolute inset-0 rounded-full border-4 border-[#C8A45C] shadow-[0_0_60px_20px_rgba(200,164,92,0.5)]"
              style={{ animation: neutralized ? "none" : "pulse 1.2s ease-in-out infinite" }}
            />
          )}
          {neutralized && (
            <div
              className="absolute inset-0 rounded-full border-4 border-emerald-400 shadow-[0_0_60px_25px_rgba(16,185,129,0.6)]"
              style={{
                clipPath: `polygon(0 0, ${(p - 0.5) * 200}% 0, ${(p - 0.5) * 200}% 100%, 0 100%)`,
              }}
            />
          )}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[10%] flex flex-col items-center gap-6 px-6 text-center">
        <FadeRise show={p > 0.05}>
          <p className="text-white/80" style={{ fontSize: "clamp(1.25rem, 3.5vw, 2.5rem)" }}>
            «الأخطاء التشغيلية تُكلّفك بصمت.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.4}>
          <p
            className="font-bold text-emerald-300"
            style={{ fontSize: "clamp(1.5rem, 4.5vw, 3.5rem)" }}
          >
            «الذكاء التنبؤي يكشفها قبل وقوعها.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.65}>
          <p className="font-black text-white" style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}>
            الأخطاء تنخفض حتى −<Counter target={50} progress={(p - 0.5) / 0.5} />
          </p>
        </FadeRise>
      </div>
    </>
  );
}

// SCENE 6 — عصر الذكاء (montage)
function Scene6(p: number) {
  const seq = [KSA_IMAGES.easternSkyline, KSA_IMAGES.kafd, KSA_IMAGES.kingdomTower];
  const segLen = 1 / seq.length;
  return (
    <>
      {seq.map((src, i) => {
        const segStart = i * segLen;
        const local = (p - segStart) / segLen;
        let opacity = 0;
        if (local >= 0 && local <= 1) {
          if (local < 0.15) opacity = local / 0.15;
          else if (local > 0.85) opacity = (1 - local) / 0.15;
          else opacity = 1;
        }
        if (opacity <= 0) return null;
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{ opacity, transition: "opacity 500ms linear" }}
          >
            <KenBurnsImage
              src={src}
              progress={local}
              direction={i % 2 === 0 ? 1 : -1}
              opacity={0.85}
            />
          </div>
        );
      })}
      <Particles color="#38E1FF" fast />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <FadeRise show={p > 0.05}>
          <p className="font-bold text-white" style={{ fontSize: "clamp(1.75rem, 5vw, 4.5rem)" }}>
            «نحن في عصر الذكاء الاصطناعي — النمو فيه لمن يتحرك أولًا.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.4}>
          <p className="font-bold text-white/90" style={{ fontSize: "clamp(1.5rem, 4vw, 3.5rem)" }}>
            «كل يومِ تأخيرٍ… فرصةٌ يلتقطها غيرك.»
          </p>
        </FadeRise>
        <FadeRise show={p > 0.7}>
          <p className="font-black text-emerald-300" style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}>
            «نيكسوس يجعلك في المقدمة.»
          </p>
        </FadeRise>
      </div>
    </>
  );
}

// SCENE 7 — الرؤية والختام
function Scene7(p: number) {
  const showCta = p > 0.55;
  return (
    <>
      <KenBurnsImage src={KSA_IMAGES.kingdomTower} progress={p} opacity={0.5} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <FadeRise show={p > 0.1}>
          <svg
            width="80"
            height="90"
            viewBox="0 0 80 90"
            className="drop-shadow-[0_0_20px_rgba(200,164,92,0.6)]"
          >
            <polygon
              points="40,4 74,22 74,68 40,86 6,68 6,22"
              fill="none"
              stroke="#C8A45C"
              strokeWidth="2.5"
            />
            <polygon points="40,20 60,30 60,60 40,70 20,60 20,30" fill="#C8A45C" opacity="0.25" />
          </svg>
        </FadeRise>
        <FadeRise show={p > 0.2}>
          <p className="font-bold text-white" style={{ fontSize: "clamp(1.75rem, 5vw, 4.5rem)" }}>
            «إنجاز الأعمال رقميًا — مواكبةً لرؤية المملكة ٢٠٣٠.»
          </p>
        </FadeRise>
        <FadeRise show={showCta}>
          <Link
            to="/"
            className="inline-block rounded-full bg-[#C8A45C] px-10 py-4 text-lg font-black text-black shadow-[0_0_40px_10px_rgba(200,164,92,0.4)] transition hover:scale-105 hover:bg-[#d4b370] sm:text-xl"
          >
            ابدأ اليوم
          </Link>
        </FadeRise>
        <FadeRise show={p > 0.75}>
          <p className="text-xs text-white/50 sm:text-sm">النسب مستهدفات قطاعية استرشادية</p>
        </FadeRise>
      </div>
    </>
  );
}

/* ---------- ambient particles ---------- */
function Particles({ color, fast = false }: { color: string; fast?: boolean }) {
  const items = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 4,
        i,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0">
      {items.map((it) => (
        <div
          key={it.i}
          className="absolute rounded-full"
          style={{
            left: `${it.left}%`,
            top: `${it.top}%`,
            width: it.size,
            height: it.size,
            background: color,
            boxShadow: `0 0 ${6 + it.size * 3}px ${color}`,
            animation: `promoDrift ${fast ? 3 : 6}s ease-in-out ${it.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- root ---------- */

function PromoImpact() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    preloadKsaImages();
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const scenes: Scene[] = useMemo(
    () => [
      { id: "s1", start: 0, end: 8, render: Scene1 },
      { id: "s2", start: 8, end: 17, render: Scene2 },
      { id: "s3", start: 17, end: 26, render: Scene3 },
      { id: "s4", start: 26, end: 35, render: Scene4 },
      { id: "s5", start: 35, end: 44, render: Scene5 },
      { id: "s6", start: 44, end: 53, render: Scene6 },
      { id: "s7", start: 53, end: 60, render: Scene7 },
    ],
    [],
  );

  if (reduced) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#04070F] p-8 text-white">
        <h1 className="mb-6 text-3xl font-bold">نيكسوس — الفصول</h1>
        <ol className="space-y-4 text-lg">
          <li>الصدمة — أنظمتك كثيرة… وإنجازك قليل.</li>
          <li>التوحيد — بياناتك مبعثرة، نيكسوس يوحّدها. −٤٠٪</li>
          <li>الأتمتة — الجهد اليدوي يختفي. −٦٠٪</li>
          <li>القرار اللحظي — سرعة القرار ×٣</li>
          <li>التنبؤ — الأخطاء تنخفض. −٥٠٪</li>
          <li>عصر الذكاء — نيكسوس يجعلك في المقدمة.</li>
          <li>
            رؤية ٢٠٣٠ —{" "}
            <Link to="/" className="text-emerald-300 underline">
              ابدأ اليوم
            </Link>
          </li>
        </ol>
        <p className="mt-6 text-sm text-white/50">النسب مستهدفات قطاعية استرشادية</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes promoDrift {
          0%,100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(6px); opacity: 0.9; }
        }
      `}</style>
      <div
        role="button"
        tabIndex={0}
        aria-label={paused ? "تشغيل العرض" : "إيقاف العرض مؤقتاً"}
        aria-pressed={paused}
        onClick={() => setPaused((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPaused((v) => !v);
          }
        }}
        className="cursor-pointer"
      >
        <ScenePlayer scenes={scenes} duration={DURATION} paused={paused} />
        <HologramOverlay />
      </div>
    </>
  );
}
