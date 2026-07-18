import { useEffect } from "react";
import {
  AudioWaveform,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAria } from "@/lib/aria-core/hooks/useAria";
import { useI18n } from "@/lib/i18n";

/**
 * Compatibility surface for historical `/assistant` links.
 * It opens the singleton root-mounted copilot and never creates another chat,
 * transport, memory, microphone, or TTS owner.
 */
export function CanonicalAriaRoute() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { open, mode } = useAria();

  useEffect(() => {
    open({ focus: true });
  }, [open]);

  return (
    <main className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-5 py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,hsl(var(--primary)/0.14),transparent_46%)]" />
      <section className="spatial-window relative w-full max-w-3xl overflow-hidden rounded-[2rem] p-7 text-center sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-cyan-300/30 bg-cyan-400/10 shadow-[0_0_55px_rgba(34,211,238,0.22)]">
          <Sparkles className="h-9 w-9 text-cyan-200" />
        </div>
        <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.42em] text-cyan-300">
          NEXIOS · ONE ARIA
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {ar ? "آريا الموحّدة" : "The unified ARIA"}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          {ar
            ? "مساحة واحدة رسمية للمحادثة والصوت والذاكرة والأوامر، مستمرة معك في جميع صفحات النظام."
            : "One official conversation, voice, memory, and command surface that follows you across the entire system."}
        </p>

        <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
          {[
            {
              Icon: BrainCircuit,
              ar: "ذاكرة واحدة",
              en: "One memory",
            },
            {
              Icon: AudioWaveform,
              ar: "صوت واحد",
              en: "One voice",
            },
            {
              Icon: ShieldCheck,
              ar: "مسار محكوم",
              en: "Governed runtime",
            },
          ].map(({ Icon, ar: labelAr, en }) => (
            <div
              key={en}
              className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-sm text-foreground/90"
            >
              <Icon className="mx-auto mb-2 h-5 w-5 text-cyan-300" />
              {ar ? labelAr : en}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => open({ focus: true })}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/35 bg-gradient-to-r from-cyan-400/20 to-violet-500/20 px-6 py-3 text-sm font-semibold text-foreground shadow-[0_0_34px_rgba(34,211,238,0.14)] transition hover:border-cyan-200/60 hover:from-cyan-400/30 hover:to-violet-500/30"
        >
          <Sparkles className="h-4 w-4 text-cyan-200" />
          {mode === "collapsed"
            ? ar
              ? "افتح آريا"
              : "Open ARIA"
            : ar
              ? "آريا جاهزة الآن"
              : "ARIA is ready"}
        </button>
      </section>
    </main>
  );
}
