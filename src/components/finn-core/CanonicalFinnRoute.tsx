import { useEffect } from "react";
import { AudioWaveform, BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";
import { useFinn } from "@/lib/finn-core/hooks/useFinn";
import { useI18n } from "@/lib/i18n";

/**
 * Compatibility surface for historical `/assistant` links.
 * It opens the singleton root-mounted copilot and never creates another chat,
 * transport, memory, microphone, or TTS owner.
 */
export function CanonicalFinnRoute() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { open, ask, mode } = useFinn();

  useEffect(() => {
    open({ focus: true });
  }, [open]);

  const activate = (prompt: string) => {
    open({ focus: true });
    ask(prompt);
  };

  return (
    <main className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-5 py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,hsl(var(--primary)/0.14),transparent_46%)]" />
      <section className="spatial-window relative w-full max-w-3xl overflow-hidden rounded-[2rem] p-7 text-center sm:p-10">
        <button
          type="button"
          onClick={() => open({ focus: true })}
          aria-label={ar ? "افتح FINN" : "Open FINN"}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-cyan-300/30 bg-cyan-400/10 shadow-[0_0_55px_rgba(34,211,238,0.22)] transition hover:scale-105 hover:border-cyan-200/60"
        >
          <Sparkles className="h-9 w-9 text-cyan-200" />
        </button>
        <p className="mt-7 text-[12px] font-bold uppercase tracking-[0.42em] text-cyan-300">
          FINN · المساعد التنفيذي
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {ar ? "FINN الموحّد" : "The unified FINN"}
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
              promptAr: "اعرض لي ما تتذكّرينه عن جلستي الحالية وسياق عملي.",
              promptEn: "Show me what you remember about my current session and work context.",
            },
            {
              Icon: AudioWaveform,
              ar: "صوت واحد",
              en: "One voice",
              promptAr: "ابدأ المحادثة الصوتية وردّ عليّ صوتيًا.",
              promptEn: "Start the voice conversation and reply to me by voice.",
            },
            {
              Icon: ShieldCheck,
              ar: "مسار محكوم",
              en: "Governed runtime",
              promptAr: "اشرح لي ضوابط الحوكمة والصلاحيات المطبّقة على هذه الجلسة.",
              promptEn: "Explain the governance and permission controls applied to this session.",
            },
          ].map(({ Icon, ar: labelAr, en, promptAr, promptEn }) => (
            <button
              key={en}
              type="button"
              onClick={() => activate(ar ? promptAr : promptEn)}
              className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-sm text-foreground/90 transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-400/10"
            >
              <Icon className="mx-auto mb-2 h-5 w-5 text-cyan-300" />
              {ar ? labelAr : en}
            </button>
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
              ? "افتح FINN"
              : "Open FINN"
            : ar
              ? "FINN جاهز الآن"
              : "FINN is ready"}
        </button>
      </section>
    </main>
  );
}
