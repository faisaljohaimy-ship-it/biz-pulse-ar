import { createFileRoute } from "@tanstack/react-router";
import { AriaAvatar } from "@/components/aria/AriaAvatar";
import { useAriaPresentationMode, togglePresentationMode } from "@/lib/aria/presentation-mode";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/aria")({
  component: AriaShowcase,
  head: () => ({
    meta: [
      { title: "ARIA — Executive Presence · NEXIOS AI OS" },
      {
        name: "description",
        content:
          "Meet ARIA, the executive AI presence at the core of NEXIOS AI OS — bilingual, always-on, evidence-locked.",
      },
    ],
  }),
});

function AriaShowcase() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const mode = useAriaPresentationMode();

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen bg-[#03101B] text-cyan-50 flex flex-col items-center justify-center px-4 py-16 gap-8"
    >
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white text-center">
        {isAr ? "آريا — الحضور التنفيذي" : "ARIA — Executive Presence"}
      </h1>
      <div className="relative">
        <AriaAvatar
          mode={mode}
          framing="portrait"
          size={mode === "orb" ? 260 : 340}
          alt={isAr ? "آريا" : "ARIA"}
        />
      </div>
      <button
        type="button"
        onClick={() => togglePresentationMode()}
        className="rounded-full border border-cyan-400/40 bg-[#061A2E]/80 px-5 py-2 text-[13px] uppercase tracking-[0.25em] text-cyan-100 hover:bg-cyan-400/10 transition"
      >
        ✦ {mode === "hologram"
          ? isAr ? "تبديل إلى الوضع الرمزي" : "Switch to Orb"
          : isAr ? "تبديل إلى الوضع الهولوجرامي" : "Switch to Hologram"}
      </button>
      <p className="max-w-md text-center text-[13px] text-cyan-200/70 leading-relaxed">
        {isAr
          ? "الوضع الافتراضي هولوجرامي — بورتريه للرأس والكتفين. الوضع الرمزي متاح للعروض الرسمية."
          : "Default is hologram portrait. Orb mode is one tap away for formal and government demos."}
      </p>
    </main>
  );
}
